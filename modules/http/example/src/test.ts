import { CodeResult, createServer } from "@msom/http";
import path from "path";
import fs from "fs";

// #region 测试代理下载文件
createServer(9999, {
  createHandle: ({ port }) => {
    console.log("服务器已启动", port);
  },
  printProxy: true,
  routes: [
    {
      path: "/file",
      children: [
        {
          path: "/download",
          method: "get",
          handlers: [
            async (request, response) => {
              try {
                const { isChunk: isChunkStr } = request.query as any;
                const isChunk = isChunkStr === "true";

                // 构建文件路径
                const fileName = "aaaa.jpg";
                const filePath = path.resolve(".", fileName);

                // 检查文件是否存在
                if (!fs.existsSync(filePath)) {
                  response.status(404).json(new CodeResult(1));
                  return;
                }

                // 获取文件状态
                const stats = fs.statSync(filePath);
                const fileSize = stats.size;

                // 处理分片下载
                if (isChunk) {
                  const range = request.headers.range;
                  if (!range) {
                    response
                      .status(400)
                      .json(new CodeResult(1, "需要Range请求头"));
                    return;
                  }

                  // 解析范围参数
                  const parts = range.replace(/bytes=/, "").split("-");
                  const start = parseInt(parts[0], 10);
                  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                  // 验证范围有效性
                  if (start >= fileSize || end >= fileSize || start > end) {
                    response
                      .status(416)
                      .json(new CodeResult(1, "请求范围不符合要求"));
                    return;
                  }

                  // 设置分片下载头
                  response.writeHead(206, {
                    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                    "Accept-Ranges": "bytes",
                    "Content-Length": end - start + 1,
                    "Content-Type": "application/octet-stream",
                  });

                  // 创建文件流
                  const fileStream = fs.createReadStream(filePath, {
                    start,
                    end,
                  });
                  fileStream.pipe(response);
                } else {
                  // 普通文件下载
                  // 设置下载头 文件名支持中文
                  response.writeHead(200, {
                    "Content-Length": fileSize,
                    "Content-Type": "application/octet-stream",
                    "Content-Disposition": `attachment; filename="${encodeURIComponent(
                      fileName
                    )}"`,
                  });

                  fs.createReadStream(filePath).pipe(response);
                }
              } catch (error) {
                console.log(error);
                response
                  .status(500)
                  .json(
                    new CodeResult(1, "文件下载失败", { e: error.message })
                  );
              }
            },
          ],
        },
        {
          path: "/preview",
          method: "get",
          handlers: [
            async (request, response) => {
              try {
                const { fileName } = request.query as any;

                // 构建文件路径
                const filePath = path.resolve("./aaaa.jpg");

                // 检查文件是否存在
                if (!fs.existsSync(filePath)) {
                  response.status(404).json(new CodeResult(1, "文件不存在"));
                  return;
                }

                // 获取文件状态
                const stats = fs.statSync(filePath);
                const fileSize = stats.size;

                // 设置预览头
                response.writeHead(200, {
                  "Content-Length": fileSize,
                  "Content-Type": "image/jpeg",
                });

                fs.createReadStream(filePath).pipe(response);
              } catch (error) {
                console.log(error);
                response
                  .status(500)
                  .json(
                    new CodeResult(1, "文件预览失败", { e: error.message })
                  );
              }
            },
          ],
        },
      ],
    },
  ],
});

// #endregion 测试代理下载文件
