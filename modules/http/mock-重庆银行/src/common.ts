export const createQueryOne = (
  getDatas: () => any[],
  dataField: string,
  param: string,
) => {
  return (req, res) => {
    if (!Reflect.has(req.params, param)) {
      res.json({
        code: 400,
        message: "error",
        data: null,
        total: 0,
      });
      return;
    }
    const value = req.params[param];
    const datas = getDatas();
    const index = datas.findIndex(
      (item) => item[dataField] === value.toString(),
    );
    if (index === -1) {
      res.json({
        code: 404,
        message: "error",
        data: null,
        total: 0,
      });
      return;
    }
    res.json({
      code: 200,
      message: "success",
      data: datas[index],
      total: 1,
    });
  };
};
