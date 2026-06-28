import { Router } from "express";
import scoreRoutes from "./scoreRoutes.js";
import simulationRoutes from "./simulationRoutes.js";

const router = Router();

router.use("/", simulationRoutes);
router.use("/score", scoreRoutes);

export default router;
