// 为所有关系元数据补充 models 字段
const dbs = ['model-designer', 'model_designer'];
let updated = 0;
for (const dbName of dbs) {
  const coll = db.getSiblingDB(dbName).getCollection('__META__');
  const rels = coll.find({META_TYPE:'relation'}).toArray();
  for (const rel of rels) {
    let models = [];
    if (rel.relationType === 'inherit') {
      models = [rel.source, rel.target];
    } else if (rel.relationship) {
      const ids = new Set();
      for (const dir of Object.values(rel.relationship)) {
        if (dir.source) ids.add(dir.source);
        if (dir.target) ids.add(dir.target);
      }
      models = Array.from(ids);
    }
    coll.updateOne({_id: rel._id}, {$set: {models: models}});
    updated++;
    print(dbName + ' / ' + rel.id + ' -> models: ' + JSON.stringify(models));
  }
}
print('Total updated: ' + updated);
