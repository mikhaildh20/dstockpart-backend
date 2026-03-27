import * as sectionRepository from "../repositories/section.repository.js";

export const getSections = async () => {
    const result = await sectionRepository.getSections();
    return result;
}