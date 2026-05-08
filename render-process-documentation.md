# Ocean-JS 渲染流程说明文档

## 1. 渲染系统架构

Ocean-JS 采用了基于 Fiber 架构的渲染系统，这是一种类似 React 的协调渲染机制，具有以下特点：

- **增量渲染**：利用浏览器的空闲时间进行渲染工作
- **优先级调度**：可以中断和恢复渲染过程
- **虚拟 DOM**：通过 VNode 表示 UI 结构
- **组件化**：支持类组件和函数组件

## 2. 核心数据结构

### 2.1 Fiber 结构

```typescript
interface Fiber {
  type?: keyof Msom.JSX.ElementTypeMap | null;
  dom: HTMLElement | Text | null;
  props: Msom.H<any>;
  alternate: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  parent: Fiber | null;
  effectTag: "UPDATE" | "PLACEMENT" | "DELETION" | null;
  component: IComponent | null; // 类组件实例
  rootFiber: Fiber | null; // 根Fiber
}
```

**字段说明**：

- `type`：节点类型，如 HTML 标签名或组件构造函数
- `dom`：对应的真实 DOM 元素
- `props`：节点属性
- `alternate`：指向旧 Fiber 节点（用于比较更新）
- `child`：第一个子 Fiber 节点
- `sibling`：下一个兄弟 Fiber 节点
- `parent`：父 Fiber 节点
- `effectTag`：副作用标签，标记节点的更新类型
- `component`：类组件实例
- `rootFiber`：根 Fiber 节点

## 3. 渲染流程

### 3.1 渲染入口：`render` 函数

**功能**：启动渲染流程，创建根 Fiber 并开始工作循环

**参数**：

- `element`：要渲染的 VNode
- `container`：渲染容器
- `_wipRoot`：工作中的 Fiber 根节点
- `_currentRoot`：当前 Fiber 根节点

**流程**：

1. 初始化删除队列
2. 创建根 Fiber 节点
3. 将根 Fiber 设置为下一个工作单元
4. 请求浏览器空闲时间执行工作循环

```typescript
export function render(
  element: Msom.MsomElement,
  container: HTMLElement,
  _wipRoot: Observer<Fiber | null> = wipRoot,
  _currentRoot: Observer<Fiber> = currentRoot,
) {
  deletions.set(deletions.get() || []);
  _wipRoot.set({
    parent: null,
    dom: container,
    props: { children: [element] },
    alternate: _currentRoot.get(),
    type: null,
    effectTag: null,
    child: null,
    sibling: null,
    component: null,
    rootFiber: null,
  });
  nextUnitOfWork.set(_wipRoot.get());
  requestIdleCallback(workLoop);
}
```

### 3.2 工作循环：`workLoop` 函数

**功能**：在浏览器空闲时间执行工作单元

**流程**：

1. 检查是否有工作单元且有剩余时间
2. 执行工作单元并获取下一个工作单元
3. 如果没有工作单元且存在工作根，则提交更改
4. 继续请求浏览器空闲时间

```typescript
function workLoop(deadline: IdleDeadline) {
  while (nextUnitOfWork.get() && deadline.timeRemaining() > 0) {
    const _nextUnitOfWork = performUnitOfWork(nextUnitOfWork.get()!);
    nextUnitOfWork.set(_nextUnitOfWork);
  }
  if (!nextUnitOfWork.get() && wipRoot.get()) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}
```

### 3.3 执行工作单元：`performUnitOfWork` 函数

**功能**：处理单个 Fiber 节点，包括创建 DOM、协调子节点等

**流程**：

1. **处理组件**：
   - 对于类组件，创建或更新组件实例
   - 处理组件的生命周期
   - 处理事件绑定
   - 渲染组件内容
2. **处理普通元素**：
   - 创建 DOM 元素
3. **协调子节点**：
   - 比较新旧子节点
   - 标记需要更新、插入或删除的节点
4. **返回下一个工作单元**：
   - 优先返回子节点
   - 其次返回兄弟节点
   - 最后返回父节点的兄弟节点

### 3.4 协调子节点：`reconcileChildren` 函数

**功能**：比较新旧子节点，确定需要执行的操作

**流程**：

1. 遍历新子节点和旧 Fiber 节点
2. 比较节点类型：
   - 相同类型：标记为更新
   - 新节点存在且类型不同：创建新节点
   - 旧节点存在且类型不同：标记为删除
3. 构建 Fiber 节点链表

### 3.5 提交更改：`commitRoot` 函数

**功能**：将 Fiber 树的更改提交到 DOM

**流程**：

1. 处理删除队列中的节点
2. 递归处理子节点
3. 更新当前根节点
4. 重置工作根节点

### 3.6 提交工作：`commitWork` 函数

**功能**：处理单个 Fiber 节点的 DOM 操作

**流程**：

1. **处理组件**：
   - 更新组件：移除旧 DOM，渲染新 DOM
   - 首次挂载：渲染组件内容，调用 mounted 生命周期
   - 卸载组件：移除 DOM，调用 unmount 生命周期
2. **处理普通元素**：
   - 更新元素：更新 DOM 属性
   - 插入元素：添加到 DOM
   - 删除元素：从 DOM 中移除
3. 递归处理子节点和兄弟节点

## 4. 组件生命周期

### 4.1 类组件生命周期

1. **created**：组件实例创建时调用
2. **setup**：组件设置时调用
3. **rendered**：组件渲染完成后调用
4. **mounted**：组件首次挂载到 DOM 后调用
5. **unmount**：组件从 DOM 中卸载时调用

### 4.2 生命周期调用时机

- **created**：在创建组件实例时调用
- **setup**：在组件设置阶段调用
- **rendered**：在组件渲染完成后调用
- **mounted**：在组件首次挂载到 DOM 后调用
- **unmount**：在组件从 DOM 中卸载时调用

## 5. DOM 操作

### 5.1 创建 DOM：`createDom` 函数

**功能**：根据 Fiber 节点创建 DOM 元素

**流程**：

1. 根据节点类型创建元素（文本节点或 HTML 元素）
2. 更新 DOM 属性
3. 返回创建的 DOM 元素

### 5.2 更新 DOM：`updateDom` 函数

**功能**：更新 DOM 元素的属性

**流程**：

1. 处理 class 和 style 属性
2. 处理事件绑定
3. 应用其他属性
4. 处理 ref

### 5.3 渲染组件 VNode：`renderComponentVNode` 函数

**功能**：将组件的 VNode 渲染到容器中

**流程**：

1. 处理文本节点
2. 处理普通 DOM 元素
3. 处理嵌套组件

## 6. 事件系统

### 6.1 事件绑定

- 使用 `DOMEVENTBINDSYMBOL` 存储事件映射
- 支持事件的添加和移除
- 支持自定义事件绑定

### 6.2 事件处理

- 事件处理器包装，支持事件对象代理
- 支持事件冒泡和默认行为

## 7. 渲染流程调用关系

```
render() → requestIdleCallback(workLoop)
workLoop() → performUnitOfWork()
performUnitOfWork() → reconcileChildren()
workLoop() → commitRoot()
commitRoot() → commitWork()
commitWork() → renderComponentVNode()
```

## 8. 性能优化

1. **增量渲染**：利用浏览器空闲时间进行渲染
2. **Fiber 架构**：支持中断和恢复渲染过程
3. **协调算法**：高效比较新旧节点，减少 DOM 操作
4. **事件委托**：优化事件处理
5. **批量更新**：减少重绘和回流

## 9. 代码优化建议

1. **内存管理**：
   - 确保事件监听器在组件卸载时正确移除
   - 避免内存泄漏

2. **性能优化**：
   - 考虑使用 memoization 优化组件渲染
   - 减少不必要的重新渲染

3. **代码可读性**：
   - 提取重复代码为函数
   - 增加注释说明复杂逻辑

4. **错误处理**：
   - 增加错误边界，防止渲染错误影响整个应用

## 10. 输入输出示例

### 10.1 基本渲染示例

**输入**：

```typescript
import { render, h } from "@msom/dom";

const app = h("div", { class: "app" }, [
  h("h1", null, "Hello Ocean-JS"),
  h("p", null, "This is a basic rendering example"),
]);

render(app, document.getElementById("root"));
```

**输出**：

```html
<div class="app">
  <h1>Hello Ocean-JS</h1>
  <p>This is a basic rendering example</p>
</div>
```

### 10.2 组件渲染示例

**输入**：

```typescript
import { Component, h, render } from "@msom/dom";

class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return h("div", null, [
      h("h2", null, `Count: ${this.state.count}`),
      h("button", { onClick: () => this.increment() }, "Increment"),
    ]);
  }
}

render(h(Counter), document.getElementById("root"));
```

**输出**：

```html
<div>
  <h2>Count: 0</h2>
  <button>Increment</button>
</div>
```

## 11. 总结

Ocean-JS 的渲染系统采用了现代前端框架的设计理念，基于 Fiber 架构实现了高效的增量渲染。其核心特点包括：

- **Fiber 架构**：支持增量渲染和优先级调度
- **协调算法**：高效比较新旧节点，减少 DOM 操作
- **组件化**：支持类组件和函数组件
- **生命周期**：提供完整的组件生命周期钩子
- **事件系统**：支持事件委托和自定义事件

这种设计使得 Ocean-JS 能够处理复杂的 UI 渲染，同时保持良好的性能和可维护性。
