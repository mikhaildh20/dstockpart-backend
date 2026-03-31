import * as dashboardRepository from "../repositories/dashboard.repository.js";

export const getDashboardModels = async () => {
    const result = await dashboardRepository.getDashboardModels();
    return result || [];
};

export const getDashboardByModel = async ({ modelId }) => {
    const result = await dashboardRepository.getDashboardByModel({ modelId });
    if (!result) {
        throw new Error("Failed to fetch dashboard data");
    }
    return result;
};
