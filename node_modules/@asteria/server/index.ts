import express, { Request, Response } from "express";
import cores from "cors";
import fs from "fs";
import path from "path";
import {GameState} from "@asteria/shared_types";
import {createInitialGameState, advanceTime} from "@asteria/sim_core"