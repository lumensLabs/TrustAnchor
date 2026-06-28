import swaggerJSDoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "RemitLend API",
    version: "1.0.0",
    description: "API documentation for RemitLend backend",
  },
  servers: [
    {
      url: "http://localhost:3001/api",
      description: "Development server",
    },
  ],
};

const options: swaggerJSDoc.Options = {
  swaggerDefinition,
  apis: [path.resolve(__dirname, "../routes/*.js"), path.resolve(__dirname, "../routes/*.ts")],
};

export const swaggerSpec = swaggerJSDoc(options);
