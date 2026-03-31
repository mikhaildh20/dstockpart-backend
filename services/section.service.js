import * as sectionRepository from "../repositories/section.repository.js";


export const getSections = async (filters) => {
    const result = await sectionRepository.getSections(filters);

    if (!result) {
        throw new Error("Failed to fetch sections data");
    }

    return {
        data: result.Data || [],
        totalData: result.TotalData || 0,
    };
};

export const createSection = async ({ code, name }) => {
    const result = await sectionRepository.createSections({ code, name });

    if (!result) {
        throw new Error("Failed to create section");
    }

    return result;
};

export const getSectionById = async ({ id }) => {
    const result = await sectionRepository.getSectionById(id);

    if (!result) {
        throw new Error("Failed to fetch section data");
    }

    return result;
};

export const updateSection = async ({ id, code, name }) => {
    const result = await sectionRepository.updateSection({ id, code, name });

    if (!result) {
        throw new Error("Failed to update section");
    }
    return result;
};

export const toggleSectionStatus = async ({ id }) => {
    const result = await sectionRepository.toggleSectionStatus({ id });

    if (!result) {
        throw new Error("Failed to toggle section status");
    }

    return result;
};