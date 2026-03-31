import * as planRepository from "../repositories/plan.repository.js";

const toNonNegativeInt = (value, fieldName) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error(`${fieldName} must be a non-negative number`);
    }
    return Math.floor(parsed);
};

export const getPlans = async (filters) => {
    const result = await planRepository.getPlans(filters);

    if (!result) {
        throw new Error("Failed to fetch plans data");
    }

    return {
        data: result.Data || [],
        totalData: result.TotalData || 0,
    };
};

export const getCurrentShift = async () => {
    const result = await planRepository.getCurrentShift();

    if (!result) {
        throw new Error("No shift data available");
    }

    return result;
};

export const getPlanModels = async () => {
    const result = await planRepository.getPlanModels();
    return result || [];
};

export const getPartsByModel = async ({ modelId }) => {
    const result = await planRepository.getPartsByModel({ modelId });
    return result || [];
};

export const getPlanById = async ({ id }) => {
    const result = await planRepository.getPlanById({ id });

    if (!result) {
        throw new Error("Plan not found");
    }

    return result;
};

export const createPlan = async ({
    mpdId,
    shiftId,
    qtyR,
    qtyL,
    reason,
    createdBy,
    items = [],
}) => {
    const normalizedItems = (Array.isArray(items) ? items : []).map((item, index) => ({
        mpdId: Number(item.mpdId),
        qtyR: toNonNegativeInt(item.qtyR, `R quantity (row ${index + 1})`),
        qtyL: toNonNegativeInt(item.qtyL, `L quantity (row ${index + 1})`),
    }));

    const normalizedQtyR = qtyR !== undefined && qtyR !== null
        ? toNonNegativeInt(qtyR, "R quantity")
        : 0;
    const normalizedQtyL = qtyL !== undefined && qtyL !== null
        ? toNonNegativeInt(qtyL, "L quantity")
        : 0;

    const result = await planRepository.createPlan({
        mpdId,
        shiftId,
        qtyR: normalizedQtyR,
        qtyL: normalizedQtyL,
        reason,
        createdBy,
        items: normalizedItems,
    });

    if (!result) {
        throw new Error("Failed to create plan");
    }

    return result;
};

export const updatePlan = async ({
    id,
    mpdId,
    shiftId,
    qtyR,
    qtyL,
    reason,
    items = [],
    createdBy,
}) => {
    const normalizedReason = typeof reason === "string" ? reason.trim() : "";

    if (!normalizedReason) {
        throw new Error("Reason is required when updating a plan");
    }

    const normalizedItems = (Array.isArray(items) ? items : []).map((item, index) => ({
        mpdId: Number(item.mpdId),
        qtyR: toNonNegativeInt(item.qtyR, `R quantity (row ${index + 1})`),
        qtyL: toNonNegativeInt(item.qtyL, `L quantity (row ${index + 1})`),
    }));

    const normalizedQtyR = qtyR !== undefined && qtyR !== null
        ? toNonNegativeInt(qtyR, "R quantity")
        : 0;
    const normalizedQtyL = qtyL !== undefined && qtyL !== null
        ? toNonNegativeInt(qtyL, "L quantity")
        : 0;

    const result = await planRepository.updatePlan({
        id,
        mpdId,
        shiftId,
        qtyR: normalizedQtyR,
        qtyL: normalizedQtyL,
        reason: normalizedReason,
        items: normalizedItems,
        createdBy,
    });

    if (!result) {
        throw new Error("Failed to update plan");
    }

    return result;
};
