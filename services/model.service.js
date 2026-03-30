import * as modelRepository from "../repositories/model.repository.js";

export const getModels = async (filters) => {
    const result = await modelRepository.getModels(filters);
    
    if (!result) {
        throw new Error("Failed to fetch models data");
    }

    return {
        data: result.Data || [],
        totalData: result.TotalData || 0,
    };
}

export const createModel = async ({ code }) => {
    const result = await modelRepository.createModel({ code });

    if (!result) {
        throw new Error("Failed to create model");
    }

    return result;
};

export const getModelById = async ({ id }) => {
    const result = await modelRepository.getModelById({ id });

    if (!result) {
        throw new Error("Model not found");
    }

    return result;
};

export const updateModel = async ({ id, code }) => {
    const result = await modelRepository.updateModel({ id, code });

    if (!result) {
        throw new Error("Failed to update model");
    }

    return result;
};

export const toggleModelStatus = async ({ id }) => {
    const result = await modelRepository.toggleModelStatus({ id });

    if (!result) {
        throw new Error("Failed to toggle model status");
    }

    return result;
};
