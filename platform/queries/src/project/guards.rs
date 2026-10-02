use super::*;
#[derive(Debug, Clone)]
pub struct ProjectLookupRow {
    pub name: String,
}

#[derive(Default)]
pub struct ProjectLookupQuery {
    project_id: Option<i64>,
}

impl ProjectLookupQuery {
    pub fn builder() -> Self {
        Self::default()
    }

    pub fn project_id(mut self, project_id: i64) -> Self {
        self.project_id = Some(project_id);
        self
    }

    pub async fn execute_with_db<'e, E>(
        &self,
        executor: E,
    ) -> Result<Option<ProjectLookupRow>, AppError>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let project_id = self
            .project_id
            .ok_or_else(|| AppError::Validation("project_id is required".to_string()))?;

        let row = sqlx::query("SELECT name FROM projects WHERE id = $1 AND deleted_at IS NULL")
            .bind(project_id)
            .fetch_optional(executor)
            .await?;

        Ok(row.map(|r| ProjectLookupRow {
            name: r.get("name"),
        }))
    }
}

#[derive(Default)]
pub struct StagingDeploymentCountByProjectQuery {
    project_id: Option<i64>,
}

impl StagingDeploymentCountByProjectQuery {
    pub fn builder() -> Self {
        Self::default()
    }

    pub fn project_id(mut self, project_id: i64) -> Self {
        self.project_id = Some(project_id);
        self
    }

    pub async fn execute_with_db<'e, E>(&self, executor: E) -> Result<i64, AppError>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let project_id = self
            .project_id
            .ok_or_else(|| AppError::Validation("project_id is required".to_string()))?;

        let row = sqlx::query!(
            "SELECT COUNT(*) as count FROM deployments WHERE project_id = $1 AND mode = 'staging' AND deleted_at IS NULL",
            project_id
        )
        .fetch_one(executor)
        .await?;

        Ok(row.count.unwrap_or(0))
    }
}

#[derive(Default)]
pub struct ExistingProductionDeploymentQuery {
    project_id: Option<i64>,
}

impl ExistingProductionDeploymentQuery {
    pub fn builder() -> Self {
        Self::default()
    }

    pub fn project_id(mut self, project_id: i64) -> Self {
        self.project_id = Some(project_id);
        self
    }

    pub async fn execute_with_db<'e, E>(&self, executor: E) -> Result<Option<i64>, AppError>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let project_id = self
            .project_id
            .ok_or_else(|| AppError::Validation("project_id is required".to_string()))?;

        let row = sqlx::query!(
            "SELECT id FROM deployments WHERE project_id = $1 AND mode = 'production' AND deleted_at IS NULL",
            project_id
        )
        .fetch_optional(executor)
        .await?;

        Ok(row.map(|r| r.id))
    }
}

pub struct ExistingDomainDeploymentRow {
    pub id: i64,
}

#[derive(Default)]
pub struct ExistingDomainDeploymentQuery {
    custom_domain: Option<String>,
}

impl ExistingDomainDeploymentQuery {
    pub fn builder() -> Self {
        Self::default()
    }

    pub fn custom_domain(mut self, custom_domain: impl Into<String>) -> Self {
        self.custom_domain = Some(custom_domain.into());
        self
    }

    pub async fn execute_with_db<'e, E>(
        &self,
        executor: E,
    ) -> Result<Option<ExistingDomainDeploymentRow>, AppError>
    where
        E: sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        let custom_domain = self
            .custom_domain
            .as_deref()
            .ok_or_else(|| AppError::Validation("custom_domain is required".to_string()))?;

        let row = sqlx::query!(
            "SELECT id FROM deployments WHERE (backend_host = $1 OR frontend_host = $2 OR mail_from_host = $3) AND deleted_at IS NULL",
            format!("frontend.{}", custom_domain),
            format!("accounts.{}", custom_domain),
            custom_domain
        )
        .fetch_optional(executor)
        .await?;

        Ok(row.map(|r| ExistingDomainDeploymentRow { id: r.id }))
    }
}
