import winston from "winston";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  process.env.NODE_ENV === "production"
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) =>
            `${info.timestamp} ${info.level}: ${info.message}${
              info.stack ? `\n${info.stack}` : ""
            }`
        )
      )
);

export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports: [new winston.transports.Console()],
});
