var shard_list = []
db.getSiblingDB("config").getCollection("shards").find({},{_id:1}).forEach(function(d){
    shard_list.push(d._id)
})

var sharded_collection = []
db.getSiblingDB("config").getCollection("collections").find({key: {$exists: true}},{_id:1}).forEach(function(d){
    sharded_collection.push(d._id)
})

db.adminCommand({listDatabases: 1}).databases.forEach(function(d) {
    var database = db.getSiblingDB(d.name);  
    database.getCollectionNames().forEach(function(c) { 
        var stats = database.getCollection(c).stats();
        print(d.name + "." + c)
        print("-----------------------------------")
        print("count: " + stats.count)
        print("size: " + stats.size)
        print("totalIndexSize: " + stats.totalIndexSize)
        namespace = d.name + "." + c
        if(sharded_collection.indexOf(namespace) == -1 ){
            print("file: " + stats.wiredTiger.uri.replace("statistics:table:", ""))
        } else {
            shard_list.forEach(function(s){
                nested_shard = stats.shards["shard01"]
                print("------")
                print("shard: " + s)
                print("count: " + nested_shard.count)
                print("size: " + nested_shard.size)
                print("totalIndexSize: " + nested_shard.totalIndexSize)           
                print("file: " + nested_shard.wiredTiger.uri.replace("statistics:table:", ""))

         })
        }
        print("################################################")
    
    })})
