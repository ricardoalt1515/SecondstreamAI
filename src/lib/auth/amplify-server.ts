import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import outputs from "../../../amplify_outputs.json";

const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });

export { runWithAmplifyServerContext };
