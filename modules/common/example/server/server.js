// @ts-nocheck
import { createServer } from "@msom/http";
import { build } from "../bundler/bundler.js";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROT = 3000;
const app = createServer(PROT, {
  routes: [
    {
      path: "/api/tree",
      method: "get",
      handlers: [
        async (req, res) => {
          const srcPath = path.join(__dirname, "..", "src");
          try {
            const tree = await getFileTree(srcPath);
            res.json(tree);
          } catch (error) {
            res.status(500).send(new Object(error)["message"]);
          }
        },
      ],
    },
    {
      path: "/api/bundle",
      method: "get",
      handlers: [
        async (req, res) => {
          const filePath = path.join(__dirname, "..", "src", req.query.path);
          console.log(filePath);
          try {
            const code = await build(filePath);
            res.type("application/javascript").send(code);
          } catch (error) {
            res.status(500).send(`构建失败: ${error.message}`);
          }
        },
      ],
    },
  ],
  createHandle: () => {
    console.log(`Server running at http://localhost:${PROT}`);
  },
});

// 静态文件服务
app.use(express.static(path.join(__dirname, "..", "public")));

async function getFileTree(dirPath) {
  const stats = await fs.stat(dirPath);
  if (!stats.isDirectory()) return null;

  const node = {
    name: path.basename(dirPath),
    path: path.relative(path.join(__dirname, "..", "src"), dirPath),
    children: [],
  };

  const files = await fs.readdir(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const childStats = await fs.stat(fullPath);

    if (childStats.isDirectory()) {
      const childNode = await getFileTree(fullPath);
      if (childNode) node.children.push(childNode);
    } else if (/(\.demo\.tsx|\.dev\.tsx)$/.test(file)) {
      node.children.push({
        name: file,
        path: path.relative(path.join(__dirname, "..", "src"), fullPath),
      });
    }
  }
  return node;
}
