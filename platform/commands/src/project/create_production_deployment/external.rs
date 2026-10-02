use super::*;

pub(super) async fn cleanup_external_resources_on_failure(
    cloudflare_service: &common::CloudflareService,
    frontend_hostname: &str,
    backend_hostname: &str,
    domain: &str,
) {
    tracing::warn!("Cleaning up external resources for domain: {}", domain);

    if let Err(e) = cloudflare_service
        .delete_custom_hostname(frontend_hostname)
        .await
    {
        tracing::error!(
            "Failed to cleanup frontend hostname {}: {}",
            frontend_hostname,
            e
        );
    } else {
        tracing::info!(
            "Successfully cleaned up frontend hostname: {}",
            frontend_hostname
        );
    }

    if let Err(e) = cloudflare_service
        .delete_custom_hostname(backend_hostname)
        .await
    {
        tracing::error!(
            "Failed to cleanup backend hostname {}: {}",
            backend_hostname,
            e
        );
    } else {
        tracing::info!(
            "Successfully cleaned up backend hostname: {}",
            backend_hostname
        );
    }
}

pub(super) fn ensure_no_social_methods_requested(auth_methods: &[String]) -> Result<(), AppError> {
    let requested_social_methods: Vec<&str> = auth_methods
        .iter()
        .map(String::as_str)
        .filter(|method| is_social_auth_method(method))
        .collect();

    if !requested_social_methods.is_empty() {
        return Err(AppError::Validation(
            "Social authentication cannot be enabled during production deployment creation. Configure social providers later with custom credentials in deployment settings.".to_string(),
        ));
    }

    Ok(())
}

pub(super) async fn load_project_for_production(
    project_id: i64,
    conn: &mut sqlx::PgConnection,
) -> Result<queries::ProjectLookupRow, AppError> {
    queries::ProjectLookupQuery::builder()
        .project_id(project_id)
        .execute_with_db(&mut *conn)
        .await?
        .ok_or_else(|| project_not_found(project_id))
}

pub(super) async fn ensure_production_deployment_is_unique(
    project_id: i64,
    custom_domain: &str,
    conn: &mut sqlx::PgConnection,
) -> Result<(), AppError> {
    if queries::ExistingProductionDeploymentQuery::builder()
        .project_id(project_id)
        .execute_with_db(&mut *conn)
        .await?
        .is_some()
    {
        return Err(AppError::BadRequest(
            "A production deployment already exists for this project".to_string(),
        ));
    }

    if let Some(existing) = queries::ExistingDomainDeploymentQuery::builder()
        .custom_domain(custom_domain)
        .execute_with_db(&mut *conn)
        .await?
    {
        return Err(AppError::BadRequest(format!(
            "Domain '{}' is already in use by another deployment (ID: {})",
            custom_domain, existing.id
        )));
    }

    Ok(())
}

pub(super) async fn create_custom_hostname<D>(
    deps: &D,
    hostname: &str,
    target: &str,
    kind: &str,
) -> Result<String, AppError>
where
    D: common::HasCloudflareProvider,
{
    match deps
        .cloudflare_provider()
        .create_custom_hostname(hostname, target)
        .await
    {
        Ok(custom_hostname) => {
            tracing::info!(
                "Successfully created {} custom hostname: {}",
                kind,
                hostname
            );
            Ok(custom_hostname.id)
        }
        Err(e) => {
            tracing::error!("Failed to create {} custom hostname: {}", kind, e);
            Err(AppError::External(format!(
                "Failed to create {} custom hostname: {}",
                kind, e
            )))
        }
    }
}

pub(super) async fn provision_custom_hostnames<D>(
    deps: &D,
    frontend_hostname: &str,
    backend_hostname: &str,
    domain: &str,
) -> Result<(Option<String>, Option<String>), AppError>
where
    D: common::HasCloudflareProvider,
{
    let frontend_hostname_id = create_custom_hostname(
        deps,
        frontend_hostname,
        "accounts.wacht.services",
        "frontend",
    )
    .await
    .map(Some)
    .map_err(|e| AppError::External(format!("{}. Deployment has been cleaned up.", e)))?;

    let backend_hostname_id =
        match create_custom_hostname(deps, backend_hostname, "frontend.wacht.services", "backend")
            .await
        {
            Ok(id) => Some(id),
            Err(e) => {
                cleanup_external_resources_on_failure(
                    deps.cloudflare_provider(),
                    frontend_hostname,
                    backend_hostname,
                    domain,
                )
                .await;

                return Err(AppError::External(format!(
                    "{}. Resources have been cleaned up.",
                    e
                )));
            }
        };

    Ok((frontend_hostname_id, backend_hostname_id))
}

