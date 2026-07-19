import { HttpStatusCode } from 'axios';

declare global {
    type Data = Record<string, any> | string;

    type SuccessfulResponse<D extends Data, S = HttpStatusCode> = {
        ok: true;
        data?: D;
        status?: S;
    };

    type ErrorResponse<D extends Data, S = HttpStatusCode> = {
        ok: false;
        data: D | unknown;
        status?: S;
    };
    // No `| undefined`: a failed request throws rather than resolving to nothing,
    // so an API function either returns a response or rejects.
    type BaseResponse<D extends Data> = SuccessfulResponse<D> | ErrorResponse<D>;
}
