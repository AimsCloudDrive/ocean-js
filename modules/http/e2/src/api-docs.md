# 事件管理系统 API 文档

## 1. 接口概述

本接口文档描述了事件管理系统的 RESTful API，用于对事件数据进行增删改查操作。

## 2. 基本信息

- **API 版本**: 1.0.0
- **基础路径**: `/api`
- **服务器地址**: `http://localhost:9208`
- **请求格式**: JSON
- **响应格式**: JSON

## 3. 响应格式

### 3.1 成功响应

```json
{
  "code": "00000",
  "message": "操作成功",
  "data": {}
}
```

### 3.2 失败响应

```json
{
  "code": "50000",
  "message": "操作失败",
  "error": "错误信息"
}
```

### 3.3 未找到响应

```json
{
  "code": "40400",
  "message": "资源不存在"
}
```

## 4. 接口列表

| 接口名称 | 方法   | 路径               | 功能描述                         |
| -------- | ------ | ------------------ | -------------------------------- |
| 查询列表 | POST   | `/events/query`    | 查询事件列表，支持分页和条件筛选 |
| 获取详情 | GET    | `/events/:eventId` | 根据 ID 获取事件详情             |
| 创建事件 | POST   | `/events`          | 创建新事件                       |
| 更新事件 | PUT    | `/events/:eventId` | 根据 ID 更新事件                 |
| 删除事件 | DELETE | `/events/:eventId` | 根据 ID 删除事件                 |

## 5. 接口详情

### 5.1 查询列表

#### 请求参数

| 参数名           | 类型   | 必填 | 默认值 | 描述                                                                 |
| ---------------- | ------ | ---- | ------ | -------------------------------------------------------------------- |
| pageNo           | number | 否   | 1      | 页码                                                                 |
| pageSize         | number | 否   | 10     | 每页条数                                                             |
| urgencyDegree    | string | 否   | -      | 紧急程度（0:一般, 1:较大, 2:重大, 3:特别重大）                       |
| eventCategory    | string | 否   | -      | 事件大类                                                             |
| eventSubCategory | string | 否   | -      | 事件二级分类                                                         |
| eventSource      | string | 否   | -      | 事件来源                                                             |
| state            | string | 否   | -      | 状态（0:待派发, 1:待处理, 2:处理中, 3:无人接收, 4:已办结, 5:已关闭） |

#### 请求示例

```json
{
  "pageNo": 1,
  "pageSize": 10,
  "urgencyDegree": "0",
  "state": "1"
}
```

#### 响应示例

```json
{
  "code": "00000",
  "message": "查询成功",
  "data": {
    "total": 1000,
    "dataType": "list",
    "rows": [
      {
        "index": 1,
        "eventId": "EVENT-ABC123XYZ",
        "title": "事件标题",
        "urgencyDegree": "0",
        "eventCategory": "1",
        "eventSubCategory": "2",
        "occurrenceTime": "2023-05-10 14:30:00",
        "eventSource": "0",
        "state": "1"
      }
      // 更多数据...
    ]
  }
}
```

### 5.2 获取详情

#### 请求参数

| 参数名  | 类型   | 必填 | 位置 | 描述    |
| ------- | ------ | ---- | ---- | ------- |
| eventId | string | 是   | 路径 | 事件 ID |

#### 请求示例

```
GET /api/events/EVENT-ABC123XYZ
```

#### 响应示例

```json
{
  "code": "00000",
  "message": "查询成功",
  "data": {
    "dataType": "single",
    "data": {
      "index": 1,
      "eventId": "EVENT-ABC123XYZ",
      "title": "事件标题",
      "urgencyDegree": "0",
      "eventCategory": "1",
      "eventSubCategory": "2",
      "occurrenceTime": "2023-05-10 14:30:00",
      "eventSource": "0",
      "state": "1"
    }
  }
}
```

### 5.3 创建事件

#### 请求参数

| 参数名           | 类型   | 必填 | 默认值   | 描述         |
| ---------------- | ------ | ---- | -------- | ------------ |
| title            | string | 否   | 随机生成 | 事件标题     |
| urgencyDegree    | string | 否   | "0"      | 紧急程度     |
| eventCategory    | string | 否   | "0"      | 事件大类     |
| eventSubCategory | string | 否   | "0"      | 事件二级分类 |
| occurrenceTime   | string | 否   | 当前时间 | 发生时间     |
| eventSource      | string | 否   | "0"      | 事件来源     |
| state            | string | 否   | "0"      | 状态         |

#### 请求示例

```json
{
  "title": "新事件标题",
  "urgencyDegree": "1",
  "eventCategory": "2",
  "state": "0"
}
```

#### 响应示例

```json
{
  "code": "00000",
  "message": "创建成功",
  "data": {
    "dataType": "single",
    "data": {
      "index": 1001,
      "eventId": "EVENT-NEW123XYZ",
      "title": "新事件标题",
      "urgencyDegree": "1",
      "eventCategory": "2",
      "eventSubCategory": "0",
      "occurrenceTime": "2024-01-04 09:30:00",
      "eventSource": "0",
      "state": "0"
    }
  }
}
```

### 5.4 更新事件

#### 请求参数

| 参数名           | 类型   | 必填 | 位置 | 描述         |
| ---------------- | ------ | ---- | ---- | ------------ |
| eventId          | string | 是   | 路径 | 事件 ID      |
| title            | string | 否   | body | 事件标题     |
| urgencyDegree    | string | 否   | body | 紧急程度     |
| eventCategory    | string | 否   | body | 事件大类     |
| eventSubCategory | string | 否   | body | 事件二级分类 |
| occurrenceTime   | string | 否   | body | 发生时间     |
| eventSource      | string | 否   | body | 事件来源     |
| state            | string | 否   | body | 状态         |

#### 请求示例

```json
{
  "title": "更新后的事件标题",
  "state": "2"
}
```

#### 响应示例

```json
{
  "code": "00000",
  "message": "更新成功",
  "data": {
    "dataType": "single",
    "data": {
      "index": 1,
      "eventId": "EVENT-ABC123XYZ",
      "title": "更新后的事件标题",
      "urgencyDegree": "0",
      "eventCategory": "1",
      "eventSubCategory": "2",
      "occurrenceTime": "2023-05-10 14:30:00",
      "eventSource": "0",
      "state": "2"
    }
  }
}
```

### 5.5 删除事件

#### 请求参数

| 参数名  | 类型   | 必填 | 位置 | 描述    |
| ------- | ------ | ---- | ---- | ------- |
| eventId | string | 是   | 路径 | 事件 ID |

#### 请求示例

```
DELETE /api/events/EVENT-ABC123XYZ
```

#### 响应示例

```json
{
  "code": "00000",
  "message": "删除成功"
}
```

## 6. 数据字典

### 6.1 紧急程度

| 编码 | 描述     |
| ---- | -------- |
| 0    | 一般     |
| 1    | 较大     |
| 2    | 重大     |
| 3    | 特别重大 |

### 6.2 状态

| 编码 | 描述     |
| ---- | -------- |
| 0    | 待派发   |
| 1    | 待处理   |
| 2    | 处理中   |
| 3    | 无人接收 |
| 4    | 已办结   |
| 5    | 已关闭   |

## 7. 错误码

| 错误码 | 描述           |
| ------ | -------------- |
| 00000  | 操作成功       |
| 40400  | 资源不存在     |
| 50000  | 服务器内部错误 |

## 8. 开发说明

1. 所有接口均支持跨域请求
2. 请求和响应数据格式均为 JSON
3. 分页查询时，返回数据包含总数、页码、每页条数和数据列表
4. 筛选条件仅支持 columns 配置中 search 为 true 的字段
5. 删除事件后，后续事件的 index 会自动更新

## 9. 测试说明

1. 开发服务器地址：`http://localhost:9999`
2. 启动命令：`npm run dev`
3. 测试数据：系统初始化时自动生成 1000 条模拟数据

## 10. 版本历史

| 版本  | 日期       | 描述                             |
| ----- | ---------- | -------------------------------- |
| 1.0.0 | 2026-01-04 | 初始版本，实现基本的增删改查功能 |
