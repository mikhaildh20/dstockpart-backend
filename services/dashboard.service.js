import * as dashboardRepository from "../repositories/dashboard.repository.js";

export const getDashboardModels = async () => {
    const result = await dashboardRepository.getDashboardModels();
    return result || [];
};

export const getDashboardShifts = async () => {
    const result = await dashboardRepository.getDashboardShifts();
    return result || [];
};

export const getDashboardByModel = async ({ modelId, shiftId, date }) => {
    const result = await dashboardRepository.getDashboardByModel({ modelId, shiftId, date });
    if (!result) {
        throw new Error("Failed to fetch dashboard data");
    }
    return result;
};
