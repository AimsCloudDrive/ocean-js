import { createServer } from "@msom/http";

const columns = [
  {
    dataIndex: "index",
    valueType: "index",
    title: "序号",
    width: 80,
  },
  {
    title: "事件编号",
    dataIndex: "eventId",
    search: false,
    copyable: true,
  },
  {
    title: "事件标题",
    dataIndex: "title",
    search: false,
    width: 150,
  },
  {
    title: "紧急程度",
    dataIndex: "urgencyDegree",
    search: true,
    valueType: "treeSelect",
    // 一般 较大 重大 特别重大
    valueDict: [
      {
        label: "一般",
        value: "0",
      },
      {
        label: "较大",
        value: "1",
      },
      {
        label: "重大",
        value: "2",
      },
      {
        label: "特别重大",
        value: "3",
      },
    ],
  },
  {
    title: "事件大类",
    dataIndex: "eventCategory",
    search: true,
    valueType: "treeSelect",
    valueDict: [],
  },
  {
    title: "事件二级分类",
    dataIndex: "eventSubCategory",
    search: true,
    valueType: "treeSelect",
    valueDict: [],
  },
  {
    title: "发生时间",
    dataIndex: "occurrenceTime",
    valueType: "time",
    width: 120,
    search: false,
  },
  {
    //事件来源
    title: "事件来源",
    dataIndex: "eventSource",
    search: true,
    valueType: "treeSelect",
    valueDict: [],
  },
  {
    title: "状态",
    dataIndex: "state",
    valueType: "state",
    width: 120,
    search: true,
    formItem: false,
    // 待派发 待处理 处理中 无人接收 已办结 已关闭
    valueDict: [
      {
        label: "待派发",
        value: "0",
        status: "processing",
      },
      {
        label: "待处理",
        value: "1",
        status: "processing",
      },
      {
        label: "处理中",
        value: "2",
        status: "processing",
      },
      {
        label: "无人接收",
        value: "3",
        status: "error",
      },
      {
        label: "已办结",
        value: "4",
        status: "success",
      },
      {
        label: "已关闭",
        value: "5",
        status: "error",
      },
    ],
  },
  {
    title: "操作",
    key: "option",
    width: 300,
    cellOption: [
      {
        key: "edit",
        text: "编辑",
        show(record, row, index) {
          return record.state !== "4" && record.state !== "5";
        },
      },
      { key: "view", text: "查看详情" },
    ],
  },
];

// 生成随机字符串
const randomString = (length: number = 10): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 生成随机时间
const randomDate = (): string => {
  const start = new Date("2023-01-01");
  const end = new Date();
  const random = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return random.toISOString().slice(0, 19).replace("T", " ");
};

// 定义模拟数据类型
interface MockData {
  index: number;
  eventId: string;
  title: string;
  urgencyDegree: string;
  eventCategory: string;
  eventSubCategory: string;
  occurrenceTime: string;
  eventSource: string;
  state: string;
}

// 生成1000条模拟数据
const mockDatas: MockData[] = [];
for (let i = 0; i < 1000; i++) {
  // 紧急程度枚举值
  const urgencyDegrees = ["1", "2", "3", "4"];
  // 状态枚举值
  const states = ["0", "1", "2", "3", "4"];

  mockDatas.push({
    index: i + 1,
    eventId: `EVENT-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    title: randomString(20),
    urgencyDegree:
      urgencyDegrees[Math.floor(Math.random() * urgencyDegrees.length)],
    eventCategory: Math.floor(Math.random() * 5 + 1).toString(), // 假设5个大类
    eventSubCategory: Math.floor(Math.random() * 4 + 1).toString(), // 假设每个大类下10个二级分类
    occurrenceTime: randomDate(),
    eventSource: Math.floor(Math.random() * 3 + 1).toString(), // 假设3个事件来源
    state: states[Math.floor(Math.random() * states.length)],
    // 操作列不需要数据
  });
}
createServer(9208, {
  middles: {
    define: (ds) => {
      return ds;
    },
  },
  createHandle: ({ port }) => {
    console.log("服务器已启动", port);
  },
  routes: [
    {
      path: "/api",
      children: [
        // 查询列表 - POST /api/events/query
        {
          path: "/events/query",
          method: "post",
          handlers: [
            (request, response) => {
              try {
                const { pageNo = 1, pageSize = 10 } = request.body;

                // 构建查询条件
                const queryConditions: string[] = columns
                  .filter((item) => item.search)
                  .map((item) => item.dataIndex)
                  .filter(Boolean) as string[];
                const query = (mockData: MockData): boolean => {
                  for (const key of queryConditions) {
                    if (
                      request.body[key] &&
                      mockData[key] !== request.body[key]
                    ) {
                      return false;
                    }
                  }
                  return true;
                };
                const filteredDatas = mockDatas.filter(query);
                const total = filteredDatas.length;
                const startIndex = (pageNo - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                const paginatedDatas = filteredDatas.slice(
                  startIndex,
                  endIndex
                );
                response.status(200).json({
                  code: "00000",
                  message: "查询成功",
                  data: {
                    total,
                    dataType: "list",
                    rows: paginatedDatas,
                  },
                });
              } catch (error) {
                response.status(500).json({
                  code: "50000",
                  message: "查询失败",
                  error: (error as Error).message,
                });
              }
            },
          ],
        },
        // 获取单个详情 - GET /api/events/:eventId
        {
          path: "/events/:eventId",
          method: "get",
          handlers: [
            (request, response) => {
              try {
                const { eventId } = request.params;
                const event = mockDatas.find(
                  (item) => item.eventId === eventId
                );

                if (event) {
                  response.status(200).json({
                    code: "00000",
                    message: "查询成功",
                    data: {
                      dataType: "single",
                      data: event,
                    },
                  });
                } else {
                  response.status(404).json({
                    code: "40400",
                    message: "事件不存在",
                  });
                }
              } catch (error) {
                response.status(500).json({
                  code: "50000",
                  message: "查询失败",
                  error: (error as Error).message,
                });
              }
            },
          ],
        },
        // 创建新数据 - POST /api/events
        {
          path: "/events",
          method: "post",
          handlers: [
            (request, response) => {
              try {
                const eventData = request.body;

                // 生成新的事件ID
                const newEventId = `EVENT-${Math.random()
                  .toString(36)
                  .slice(2, 9)
                  .toUpperCase()}`;

                // 创建新事件
                const newEvent: MockData = {
                  index: mockDatas.length + 1,
                  eventId: newEventId,
                  title: eventData.title || randomString(20),
                  urgencyDegree: eventData.urgencyDegree || "0",
                  eventCategory: eventData.eventCategory || "0",
                  eventSubCategory: eventData.eventSubCategory || "0",
                  occurrenceTime: eventData.occurrenceTime || randomDate(),
                  eventSource: eventData.eventSource || "0",
                  state: eventData.state || "0",
                };

                // 添加到数组
                mockDatas.unshift(newEvent);

                response.status(201).json({
                  code: "00000",
                  message: "创建成功",
                  data: {
                    dataType: "single",
                    data: newEvent,
                  },
                });
              } catch (error) {
                response.status(500).json({
                  code: "50000",
                  message: "创建失败",
                  error: (error as Error).message,
                });
              }
            },
          ],
        },
        // 更新数据 - PUT /api/events/:eventId
        {
          path: "/events/:eventId",
          method: "put",
          handlers: [
            (request, response) => {
              try {
                const { eventId } = request.params;
                const updateData = request.body;

                // 查找事件
                const eventIndex = mockDatas.findIndex(
                  (item) => item.eventId === eventId
                );

                if (eventIndex !== -1) {
                  // 更新事件
                  mockDatas[eventIndex] = {
                    ...mockDatas[eventIndex],
                    ...updateData,
                    // 保持index和eventId不变
                    index: mockDatas[eventIndex].index,
                    eventId: mockDatas[eventIndex].eventId,
                  };

                  response.status(200).json({
                    code: "00000",
                    message: "更新成功",
                    data: {
                      dataType: "single",
                      data: mockDatas[eventIndex],
                    },
                  });
                } else {
                  response.status(404).json({
                    code: "40400",
                    message: "事件不存在",
                  });
                }
              } catch (error) {
                response.status(500).json({
                  code: "50000",
                  message: "更新失败",
                  error: (error as Error).message,
                });
              }
            },
          ],
        },
        // 删除数据 - DELETE /api/events/:eventId
        {
          path: "/events/:eventId",
          method: "delete",
          handlers: [
            (request, response) => {
              try {
                const { eventId } = request.params;

                // 查找事件
                const eventIndex = mockDatas.findIndex(
                  (item) => item.eventId === eventId
                );

                if (eventIndex !== -1) {
                  // 删除事件
                  mockDatas.splice(eventIndex, 1);

                  // 更新后续事件的index
                  for (let i = eventIndex; i < mockDatas.length; i++) {
                    mockDatas[i].index = i + 1;
                  }

                  response.status(200).json({
                    code: "00000",
                    message: "删除成功",
                  });
                } else {
                  response.status(404).json({
                    code: "40400",
                    message: "事件不存在",
                  });
                }
              } catch (error) {
                response.status(500).json({
                  code: "50000",
                  message: "删除失败",
                  error: (error as Error).message,
                });
              }
            },
          ],
        },
      ],
    },
  ],
  // printProxy: true,
  // proxy: {
  //   "/ttt": {
  //     target: "http://localhost:9999",
  //     changeOrigin: true,
  //     onProxyReq: (proxyReq, req, res) => {
  //       console.log(
  //         `[PROXY:9208] ${req.method} ${req.protocol}://${req.host}${req.originalUrl} -> ${proxyReq.url}`
  //       );
  //     },
  //     onError: (err, req, res) => {
  //       console.error("[PROXY ERROR]", err);
  //       res.status(500).send("Proxy Error");
  //     },
  //   },
  // },
});
