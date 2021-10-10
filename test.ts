import { main as handler } from "./src/functions/telegram/handler"
import * as dotenv from "dotenv";

dotenv.config();
handler({}, () => {})