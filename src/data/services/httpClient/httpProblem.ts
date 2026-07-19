import { HttpStatusCode } from 'axios';

/**
 * Global response types. **This file has no importers on purpose — do not delete it
 * for looking unreferenced.**
 *
 * `declare global` augmentation is program-scoped, not import-scoped: every file
 * matched by the tsconfig `include` contributes its globals everywhere, with no
 * import needed. `responseApi.ts` uses `BaseResponse` and `ListView.tsx` uses `Data`
 * without importing this file, which is why a barrel `import './httpProblem'` was
 * removed as the no-op it was.
 *
 * The axios import is load-bearing despite appearing unused: `HttpStatusCode` is the
 * default for the `S` type parameter below.
 *
 * It once also held `apiProblem`, which fired a blocking `Alert.alert` from the data
 * layer and was never called.
 */
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
