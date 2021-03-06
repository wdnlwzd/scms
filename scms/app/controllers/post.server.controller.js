// module.exports = {
//   create: function(req, res, next){
//     if(!req.query.title || !req.query.content) {
//       return next(new Error("params error"));
//     }
//     console.log('req.models:', req.models);
//     req.models.post.create({title: req.query.title, content: req.query.content}, function(err, doc){
//       if(err) return next(err);

//       return res.json(doc);
//     });
//   }
// }
// 
// 
var redisClient = require('../../config/redis');

const REDIS_NEWS_PREFIX = 'news_';

var getNewsFromMongo = function(req, id, cb) {
  console.log('run getNewsFromMongo');
  req.models.post.findOne({id: id}).exec(function(err, doc) {
    if(doc) {
      console.log('save mongo doc to redis');
      redisClient.set(REDIS_NEWS_PREFIX + id, JSON.stringify(doc));
    }
    return cb(err, doc);
  });
};

var getNewsFromRedis = function(req, id, cb) {
  console.log('run getNewsFromRedis');
  redisClient.get(REDIS_NEWS_PREFIX + id, function(err, v) {
    if(err) 
      return cb(err, null);
    if(!v) {
      console.log('doc not in redis');
      return cb(null, null);
    }
    try {
      v = JSON.parse(v);
    } catch(e) {
      return cb(e, null);
    }
    console.log('get doc from redis');
    return cb(err, v);
  });
};

var getDeleteIdFromMongo = function(req, id, cb) {
  console.log('run getDeleteIdFromMongo');
  // console.log('find_MongoId:',id);
  redisClient.del(REDIS_NEWS_PREFIX + id);
  req.models.post.destroy({id: id}).exec(function(err) {
    return cb(null);
  });
};

var getUpdateIdFromMongo = function(req, id ,cb) {
  console.log('run getUpdateIdFromMongo');
  var message = {
    title: req.body.title,
    content: req.body.content
  }
  redisClient.del(REDIS_NEWS_PREFIX + id);
  redisClient.set(REDIS_NEWS_PREFIX + id, JSON.stringify(message));
  req.models.post.update({id: id}, message).exec(function(err, doc) {
    // console.log('err:',err);
    // console.log('doc:',doc);
    if(err) {
      return next(err);
    }
    return cb(err, doc);
  });
};

module.exports = {
  create: function(req, res, next) {
    var message = {
      title: req.body.title,
      content: req.body.content
    }

    req.models.post.create(message, function(err, doc){
      if(err) return next(err);
      return res.json(doc);
    });
  },

  // 获取列表
  list: function(req, res, next){
    req.models.post.find().exec(function(err, docs){
      if(err) return next(err);
      return res.json(docs);
    });
  },
  
  // 处理'详情'路由参数
  getById: function(req, res, next, id){
    // console.log('getById:',id);
    if(!id) return next(new Error('News not Found'));
    getNewsFromRedis(req, id, function(err, doc){
      if(err) return next(err);

      if(!doc) {
        getNewsFromMongo(req, id, function(err, doc) {
          if(err) return next(err);

          if(!doc) {
            return next(new Error('News not Found'));
          }
          req.news = doc;
          return next();
        })
      } 
      else {
        req.news = doc;
        return next();
      }
    });
  },

  //处理'删除'路由参数
  getDelId: function(req, res, next, id) {
    // console.log('getDelId:',id);
    if(!id) {
      return next(new Error('DeleteNews not Found!'));
    }
    getDeleteIdFromMongo(req, id, function(err) {
      if(err) {
        return next(err);
      }
      return next();
    });
  },

  //处理'更新'路由参数
  getUpdateId: function(req, res, next, id) {
    // console.log('getUpdateId:',id);
    if(!id) {
      return next(new Error('UpdateNews not Found!'));
    }
    getUpdateIdFromMongo(req, id, function(err, doc) {
      if(err) {
        return next(err);
      }
      // console.log('updateDoc:',doc);
      req.news = doc;
      return next();
    });
  },

  // 获取新闻详情
  get: function(req, res, next) {
    // console.log('news:',req.news)
    return res.json(req.news);
  },

  //删除一条新闻
  delete: function(req, res, next) {
    req.news = "Delete news success!";
    // console.log('delnew:',req.news)
    return res.json(req.news);
  },

  //更新一条新闻
  update: function(req, res, next) {
    // req.news = "Update news success!";
    return res.json(req.news);
  }
}