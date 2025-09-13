import app from "./app";
import { env } from "./helpers/env.helper";

app.listen(env.port, () => {
    console.log(`Server is running on port http://localhost:${env.port}`);
});