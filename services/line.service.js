import * as lineRepository from "../repositories/line.repository.js";

export const getLines = async (filters) => {
    const result = await lineRepository.getLines(filters);

    if (!result) {
        throw new Error("Failed to fetch lines data");
    }

    return {
        data: result.Data || [],
        totalData: result.TotalData || 0,
    };
};
    
export const createLine = async ({ code }) => {
    const result = await lineRepository.createLine({ code });

    if (!result) {
        throw new Error("Failed to create line");
    }

    return result;
};

export const getLineById = async ({ id }) => {
    const result = await lineRepository.getLineById(id);

    if (!result) {
        throw new Error("Failed to fetch line data");
    }

    return result;
};

export const updateLine = async ({ id, code }) => {
    const result = await lineRepository.updateLine({ id, code });

    if (!result) {
        throw new Error("Failed to update line");
    }

    return result;
};

export const toggleLineStatus = async ({ id }) => {
    const result = await lineRepository.toggleLineStatus({ id });

    if (!result) {
        throw new Error("Failed to update line status");
    }

    return result;
};
