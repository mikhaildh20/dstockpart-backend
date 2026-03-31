import * as partRepository from "../repositories/part.repository.js";

export const getParts = async (filters) => {
    const result = await partRepository.getParts(filters);

    if (!result) {
        throw new Error("Failed to fetch parts data");
    }

    return {
        data: result.Data || [],
        totalData: result.TotalData || 0,
    };
};

export const createPart = async ({ code, name }) => {
    const result = await partRepository.createParts({ code, name });

    if (!result) {
        throw new Error("Failed to create part");
    }

    return result;
};

export const getPartById = async ({ id }) => {
    const result = await partRepository.getPartById(id);

    if (!result) {
        throw new Error("Failed to fetch part data");
    }

    return result;
};

export const updatePart = async ({ id, code, name }) => {
    const result = await partRepository.updatePart({ id, code, name });

    if (!result) {
        throw new Error("Failed to update part");
    }
    return result;
};

export const togglePartStatus = async ({ id }) => {
    const result = await partRepository.togglePartStatus({ id });

    if (!result) {
        throw new Error("Failed to toggle part status");
    }

    return result;
};

export const assignsPartsToModel = async ({ modelId, assignIds, unassignIds }) => {
    const result = await partRepository.assignPartsToModel({ modelId, assignIds: assignIds, unassignIds: unassignIds });

    if (!result) {
        throw new Error("Failed to assign parts to model");
    }

    return result;
};

export const getPartSectionDetails = async ({ id }) => {
    const result = await partRepository.getPartSectionDetails({ id });

    if (!result) {
        throw new Error("Failed to fetch part section details");
    }

    return result;
};

export const savePartSectionDetails = async ({ mpdId, sectionIds }) => {
    const result = await partRepository.savePartSectionDetails({ mpdId, sectionIds });

    if (!result) {
        throw new Error("Failed to save part section details");
    }

    return result;
};
