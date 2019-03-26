// This script prints for each collection:
// - count
// - size 
// - storagesize
// - avgObjSize
// - totalIndexSize
// - wiredTiger file name
//
// Note: each size is in byte, for a sharded cluster this information is printed per shard

// Allow to hide detailed information on the indexes
var index_info = true

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
        var stats = database.getCollection(c).stats({indexDetails: index_info});
        namespace = d.name + "." + c
        print("namespace: " + namespace)
        print("-----------------------------------")
        print("count: " + stats.count)
        print("size: " + stats.size)
        print("storageSize: " + stats.storageSize)
        print("avgObjSize: " + stats.avgObjSize)
        print("totalIndexSize: " + stats.totalIndexSize)
        if(sharded_collection.indexOf(namespace) == -1 ){
            print("file: " + stats.wiredTiger.uri.replace("statistics:table:", ""))
            if(index_info == true){
                for (var key in stats.indexDetails){
                    index_stat = stats.indexDetails[key]
                    print("+++++++++++++++++++")
                    print("index: " + key)
                    print("file: " + index_stat.uri.replace("statistics:table:", ""))
                    print("size: " + stats.indexSizes[key])
                }
            }
        } else {
            print("number of chunks: " + stats.nchunks)
            shard_list.forEach(function(s){
                nested_shard = stats.shards[s]
                if (typeof nested_shard == 'undefined'){
                    print("no data on shard: " + s)
                    return
                }
                print("------")
                print("shard: " + s)
                print("count: " + nested_shard.count)
                print("size: " + nested_shard.size)
                print("storageSize: " + nested_shard.storageSize)
                print("avgObjSize: " + nested_shard.avgObjSize)
                print("totalIndexSize: " + nested_shard.totalIndexSize) 
                print("file: " + nested_shard.wiredTiger.uri.replace("statistics:table:", ""))
                if(index_info == true){
                    for (var key in nested_shard.indexDetails){
                        index_stat = nested_shard.indexDetails[key]
                        print("+++++++++++++++++++")
                        print("index: " + key)
                        print("file: " + index_stat.uri.replace("statistics:table:", ""))
                        print("size: " + nested_shard.indexSizes[key])
                    }
                }
         })
        }
        print("################################################")
    })})
