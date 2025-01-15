export interface IResponseRepository {
    getResponse: () => Promise<BaseResponse<ResponseData[]>>;
}
