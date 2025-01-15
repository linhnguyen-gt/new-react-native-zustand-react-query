import { IResponseRepository } from "@/core";

export class ResponseUseCase {
    constructor(private readonly responseRepository: IResponseRepository) {}

    async execute() {
        return await this.responseRepository.getResponse();
    }
}
