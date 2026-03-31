import * as wipRepository from "../repositories/wip.repository.js";

const toNonNegativeInt = (value, fieldName) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error(`${fieldName} must be a non-negative number`);
    }
    return Math.floor(parsed);
};

export const getWipModels = async (filters) => {
    const result = await wipRepository.getWipModels(filters);
    if (!result) {
        throw new Error("Failed to fetch WIP models");
    }

    return {
        data: result.Data || [],
        totalData: result.TotalData || 0,
    };
};

export const getWipModelDetail = async ({ modelId }) => {
    const result = await wipRepository.getWipModelDetail({ modelId });
    if (!result) {
        throw new Error("Failed to fetch WIP detail");
    }
    return result;
};

export const saveWipCurrent = async ({ shiftId, items, updatedBy }) => {
    const normalizedItems = (Array.isArray(items) ? items : []).map((item, index) => ({
        mpsdId: Number(item.mpsdId),
        qtyR: toNonNegativeInt(item.qtyR ?? 0, `Qty R (row ${index + 1})`),
        qtyL: toNonNegativeInt(item.qtyL ?? 0, `Qty L (row ${index + 1})`),
    }));

    const result = await wipRepository.saveWipCurrent({
        shiftId,
        items: normalizedItems,
        updatedBy,
    });

    if (!result) {
        throw new Error("Failed to save current stock");
    }

    return result;
};

export const getWipLogs = async ({ modelId, date }) => {
    const result = await wipRepository.getWipLogs({ modelId, date });
    return result || [];
};
