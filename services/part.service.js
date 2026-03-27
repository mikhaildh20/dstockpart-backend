import * as partRepository from "../repositories/part.repository.js";

export const getParts = async () => {
    const result = await partRepository.getParts();
    return result;
}