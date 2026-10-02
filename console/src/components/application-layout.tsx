import { Outlet, useNavigate, useLocation, useParams, useNavigation } from "react-router";
import { useState, useEffect } from "react";
import { useProjects } from "@/lib/api/hooks/use-projects";
import { AppLoading } from "./ui/loading-screen";
import { HelpButton } from "./help-button";
import { CreateProjectDialog } from "./create-project-dialog";
import { CreateProductionDeploymentDialog } from "./create-production-deployment-dialog";
import { CreateStagingDeploymentDialog } from "./create-staging-deployment-dialog";
import { setNavigationFunction } from "@/lib/store/project";
import { useCreateStagingDeployment } from "@/lib/api/hooks/use-projects";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { Deployment } from "@/types/deployment";
import { useTourAction, useTourCompletion } from "@/lib/tour";

export function ApplicationLayout() {
    useTourCompletion("first-deployment-create", true);
    const navigate = useNavigate();
    const navigation = useNavigation();
    const location = useLocation();
    const params = useParams();
    useTourAction("tour:navigate", (rel) => {
        if (!rel || !params.projectId || !params.deploymentId) return;
        const trimmed = rel.replace(/^\/+/, "");
        const deploymentRoot = `/project/${params.projectId}/deployment/${params.deploymentId}`;
        const deploymentRoutePattern =
            /^(api-keys|auth|b2b-settings|billing|dns-verification|go-live|llms|oauth|portal|settings|setup|sms|users|webhooks)(?:\/|$)/;
        if (deploymentRoutePattern.test(trimmed)) {
            navigate(`${deploymentRoot}/${trimmed}`);
            return;
        }
        // When we're inside an agent (URL contains /llms/ai-agents/{agentId}/...)
        // a step's bare `navigateTo` is treated as a sub-route of THIS agent.
        // So `navigateTo: "skills"` jumps to that agent's Skills tab regardless
        // of which tab the user happens to be on right now.
        const agentTabs = new Set([
            "approvals",
            "hooks",
            "knowledge-bases",
            "models",
            "skills",
            "sub-agents",
            "tools",
        ]);
        const agentMatch = location.pathname.match(
            new RegExp(
                `^${deploymentRoot}/llms/ai-agents/([^/]+)(?:/|$)`,
            ),
        );
        if (agentMatch && agentTabs.has(trimmed)) {
            navigate(
                `${deploymentRoot}/llms/ai-agents/${agentMatch[1]}/${trimmed}`,
            );
            return;
        }
        const llmTabs = new Set([
            "ai-agents",
            "ai-settings",
            "extensions",
            "knowledge-base",
            "mcp-servers",
            "tools",
        ]);
        if (llmTabs.has(trimmed)) {
            navigate(`${deploymentRoot}/llms/${trimmed}`);
            return;
        }
        navigate(`${deploymentRoot}/${trimmed}`);
    });
    const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] =
        useState(false);
    const [isCreateProductionDialogOpen, setIsCreateProductionDialogOpen] =
        useState(false);
    const [isCreateStagingDialogOpen, setIsCreateStagingDialogOpen] =
        useState(false);

    const {
        selectedProject,
        selectedDeployment,
        projects,
        isLoading: isStoreLoading,
        notFound,
        initializeFromUrl,
        setSelectedDeployment,
    } = useProjects();
    const { createStagingDeployment, isLoading: isCreatingStagingDeployment } =
        useCreateStagingDeployment();

    useEffect(() => {
        if (params.projectId && params.deploymentId && projects) {
            initializeFromUrl(params.projectId, params.deploymentId);
        }
    }, [params.projectId, params.deploymentId, projects, initializeFromUrl]);

    const isContextReady =
        !params.projectId ||
        (selectedProject?.id === params.projectId &&
            selectedDeployment?.id === params.deploymentId);

    useEffect(() => {
        setNavigationFunction(navigate);
    }, [navigate]);

    if (notFound) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-secondary">
                <h1 className="text-2xl font-normal text-foreground dark:text-foreground mb-2 tracking-tight">
                    Project Not Found
                </h1>
                <p className="text-muted-foreground mb-6 max-w-md font-normal">
                    The requested project or deployment doesn't exist or you
                    don't have access to it.
                </p>
                <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
            </div>
        );
    }

    if (isStoreLoading || !isContextReady) {
        return <AppLoading />;
    }

    const isLLMRoute = location.pathname.includes("/llms/");
    // Inside an agent detail page the section tabs give way to the agent's own
    // sub-tab nav, so the section strip is hidden there (matches the design).
    const isAgentDetailRoute = /\/llms\/ai-agents\/[^/]+/.test(
        location.pathname,
    );
    const llmsBasePath = `/project/${params.projectId}/deployment/${params.deploymentId}/llms`;
    const llmsToolsPath = `${llmsBasePath}/tools`;
    const llmsKnowledgeBasePath = `${llmsBasePath}/knowledge-base`;
    const llmsMcpServersPath = `${llmsBasePath}/mcp-servers`;
    const llmsAiSettingsPath = `${llmsBasePath}/ai-settings`;
    const llmsExtensionsPath = `${llmsBasePath}/extensions`;

    let currentTab = "";
    if (isLLMRoute) {
        currentTab =
            location.pathname === llmsToolsPath ||
            location.pathname.startsWith(`${llmsToolsPath}/`)
                ? "tools"
                : location.pathname === llmsKnowledgeBasePath ||
                    location.pathname.startsWith(`${llmsKnowledgeBasePath}/`)
                  ? "knowledge-base"
                  : location.pathname === llmsMcpServersPath ||
                      location.pathname.startsWith(`${llmsMcpServersPath}/`)
                    ? "mcp-servers"
                    : location.pathname === llmsAiSettingsPath ||
                        location.pathname.startsWith(`${llmsAiSettingsPath}/`)
                      ? "ai-settings"
                      : location.pathname === llmsExtensionsPath ||
                          location.pathname.startsWith(`${llmsExtensionsPath}/`)
                        ? "extensions"
                        : "ai-agents";
    }

    const handleTabChange = (value: string) => {
        const basePath = `/project/${params.projectId}/deployment/${params.deploymentId}`;
        if (isLLMRoute) {
            navigate(`${basePath}/llms/${value}`);
        }
    };

    const handleProductionDeploymentCreated = (deployment: Deployment) => {
        setSelectedDeployment(deployment, false);
        navigate(
            `/project/${selectedProject?.id}/deployment/${deployment.id}/go-live`,
        );
    };

    const handleStagingDeploymentCreated = (deployment: Deployment) => {
        setSelectedDeployment(deployment, false);
        navigate(`/project/${selectedProject?.id}/deployment/${deployment.id}`);
    };

    const handleCreateStagingDeployment = async (authMethods: string[]) => {
        if (!selectedProject) {
            return;
        }

        const deployment = await createStagingDeployment({
            projectId: selectedProject.id,
            authMethods,
        });

        handleStagingDeploymentCreated(deployment);
    };

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 68)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
            className="h-svh overflow-hidden"
        >
            <AppSidebar />
            <SidebarInset className="h-full overflow-hidden">
                <SiteHeader
                    onCreateProject={() => setIsCreateProjectDialogOpen(true)}
                    onCreateStaging={() => setIsCreateStagingDialogOpen(true)}
                    onCreateProduction={() => setIsCreateProductionDialogOpen(true)}
                    canCreateStaging={!!selectedProject}
                    canCreateProduction={!!selectedProject}
                />
                <div className="flex flex-1 flex-col overflow-y-auto">
                    {navigation.state !== "idle" && (
                        <div className="h-0.5 w-full overflow-hidden bg-primary/10">
                            <div className="h-full w-1/3 animate-pulse bg-primary" />
                        </div>
                    )}
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        {isLLMRoute && !isAgentDetailRoute && (
                            <div className="px-4 pt-4 lg:px-6 lg:pt-6">
                                <Tabs
                                    value={currentTab}
                                    onValueChange={handleTabChange}
                                >
                                    <TabsList variant="pill">
                                        <TabsTrigger
                                            value="ai-agents"
                                            data-tour-id="llm-tab-agents"
                                        >
                                            AI Agents
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="tools"
                                            data-tour-id="llm-tab-tools"
                                        >
                                            Tools
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="knowledge-base"
                                            data-tour-id="llm-tab-knowledge-base"
                                        >
                                            Knowledge Base
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="mcp-servers"
                                            data-tour-id="llm-tab-mcp-servers"
                                        >
                                            MCP Servers
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="ai-settings"
                                            data-tour-id="llm-tab-ai-settings"
                                        >
                                            Configuration
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="extensions"
                                            data-tour-id="llm-tab-extensions"
                                        >
                                            Extensions
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        )}
                        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </SidebarInset>

            <CreateProjectDialog
                open={isCreateProjectDialogOpen}
                onClose={() => setIsCreateProjectDialogOpen(false)}
            />
            {selectedProject && (
                <CreateProductionDeploymentDialog
                    open={isCreateProductionDialogOpen}
                    onClose={() => setIsCreateProductionDialogOpen(false)}
                    projectId={selectedProject.id}
                    onCreated={handleProductionDeploymentCreated}
                />
            )}
            <CreateStagingDeploymentDialog
                open={isCreateStagingDialogOpen}
                onOpenChange={setIsCreateStagingDialogOpen}
                onCreateStagingDeployment={handleCreateStagingDeployment}
                isLoading={isCreatingStagingDeployment}
            />

            <HelpButton />
        </SidebarProvider>
    );
}
