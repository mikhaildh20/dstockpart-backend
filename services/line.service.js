import * as lineRepository from "../repositories/line.repository.js";

export const getLines = async () => {
    const result = await lineRepository.getLines();
    return result;
}