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

// Set to true for sharded cluster 
var isSharded = true

var shard_list = []
var sharded_collection = []

const  regex_system = "^system"

if (isSharded) {
    db.getSiblingDB("config").getCollection("shards").find({}, { _id: 1 }).forEach(function (d) {
        shard_list.push(d._id)
    })
    db.getSiblingDB("config").getCollection("collections").find({ key: { $exists: true } }, { _id: 1 }).forEach(function (d) {
        sharded_collection.push(d._id)
    })
}

var total_collection_fragmentation = 0
var total_index_fragmentation = 0
var fragmentationColl = 0
var fragmentationIdx = 0

function convertMB(bytes){
    return (bytes / (1024*1024)).toFixed(2) + " MB"
}

function printCollStats(stats, sharded){
    fragmentationColl = stats.wiredTiger["block-manager"]["file bytes available for reuse"]
    print("-----------------------------------")
    print("count: " + stats.count)
    print("size: " + convertMB(stats.size))
    print("storageSize: " + convertMB(stats.storageSize))
    print("avgObjSize: " + stats.avgObjSize)
    if(!sharded){
    print("fragmentation: " + convertMB(fragmentationColl))
    }
    print("totalIndexSize: " + convertMB(stats.totalIndexSize))
}

function printIdxStats(index, stats){
    var index_stat = stats.indexDetails[index]
    fragmentationIdx = index_stat["block-manager"]["file bytes available for reuse"]
    print("+++++++++++++++++++")
    print("index: " + index)
    print("file: " + index_stat.uri.replace("statistics:table:", ""))
    print("size: " + convertMB(stats.indexSizes[index]))
    print("fragmentation: " + convertMB(fragmentationIdx))
}

db.adminCommand({listDatabases: 1, nameOnly: true}).databases.forEach(function(d) {
    if (d.name == "admin" || d.name == "config" || d.name == "local" ){
        return
    }
    var database = db.getSiblingDB(d.name);  
    database.getCollectionNames().forEach(function(c) { 
        if(c.match(regex_system)){ return }

        var stats = database.getCollection(c).stats({indexDetails: index_info});

        var namespace = d.name + "." + c
        print("namespace: " + namespace)
        printCollStats(stats, isSharded)
        total_collection_fragmentation += stats.wiredTiger["block-manager"]["file bytes available for reuse"]

        if(sharded_collection.indexOf(namespace) == -1 ){
            print("file: " + stats.wiredTiger.uri.replace("statistics:table:", ""))
            if(index_info){
                for (var key in stats.indexDetails){
                    printIdxStats(key, stats)
                    total_index_fragmentation += stats.indexDetails[key]["block-manager"]["file bytes available for reuse"]
                }
            }
        } else {
            print("number of chunks: " + stats.nchunks)
            shard_list.forEach(function(s){
                var nested_shard = stats.shards[s]
                if (typeof nested_shard == 'undefined'){
                    print("no data on shard: " + s)
                    return
                }
                print("------")
                print("shard: " + s)
                printCollStats(nested_shard, false)
                print("file: " + nested_shard.wiredTiger.uri.replace("statistics:table:", ""))
                
                total_collection_fragmentation += nested_shard.wiredTiger["block-manager"]["file bytes available for reuse"]
                if(index_info){
                    for (var key1 in nested_shard.indexDetails){
                        printIdxStats(key1, nested_shard)
                        total_index_fragmentation += nested_shard.indexDetails[key1]["block-manager"]["file bytes available for reuse"]
                    }
                }
         })
        }
        print("################################################")
    })})

    print("################################################")
    print("################################################")
    print("Total Collection fragmentation: " + convertMB(total_collection_fragmentation))
    if(index_info){ 
        print("Total Index fragmentation: " + convertMB(total_index_fragmentation))
    }
