function _class() {
  return (ctor: Function) => {};
}
function _property() {
  return (target: object, key: PropertyKey) => {};
}

@_class()
class AAA {
  @_property()
  @_property()
  declare AAA: any;
}
