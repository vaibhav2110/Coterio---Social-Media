const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var authenticate = require('../authenticate');
const cors = require('./cors');
const Article = require('../models/article');

const multer = require('multer');
const articleRouter = express.Router();

const storage = multer.diskStorage({
    destination: (req,file,cb)=> {
        cb(null, 'public/images');
    },
    filename: (req, file, cb)=>{
        cb(null, file.originalname)
    }
});

const imageFileFilter = (req, file, cb)=>{
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('You can upload only image files!'), false);
    }
    cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: imageFileFilter});
articleRouter.use(bodyParser.json());

articleRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next) => {
    let query = {};
    let options = {
        sort: { date: -1 },
        populate: [ 'author'],
        lean: true,
        page: 1,
        limit: 10
    };
    Article.paginate(query, options)
    .then((articles)=>{
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(articles);
    }, (err)=> next(err))
    .catch((err)=> next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req,res,next) => {
    req.body.author = req.user._id;
    Article.create(req.body)
    .then((article)=>{
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(article);
    }, (err)=> next(err))
    .catch((err)=> next(err));
});
articleRouter.route('/home')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, (req,res,next) => {
    if(req.user.following.length > 0 ){
        let query = {$or: [{'author' : { $in: [req.user.following] }}, {'author': req.user._id}]};
        let options = {
            sort: { date: -1 },
            populate: [ 'author'],
            lean: true,
            page: 1,
            limit: 10
        };
        Article.paginate(query, options)
        .then((articles)=>{
            console.log(articles);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(articles);
        }, (err)=> next(err))
        .catch((err)=> next(err));
        }
    else{
        Article.find({'author': req.user._id})
        .populate('author')
        .then((articles)=>{
            console.log(articles);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(articles);
        }, (err)=> next(err))
        .catch((err)=> next(err));
        }
    
});
articleRouter.route('/img')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, authenticate.verifyUser,upload.single('avatar'), (req,res,next) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json(req.file);
});

articleRouter.route('/:articleId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next)=>{
    Article.findById(req.params.articleId)
    .populate('author')
    .then((article)=>{
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(article);
    },(err)=> next(err))
    .catch((err)=>next(err));
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req,res,next)=>{
    Article.findById(req.params.articleId)
    .then((article) => {
        if( article != null ){
            var id1 = req.user._id;
            var id2 = article.author;
            if(id1.equals(id2)){
                article.remove();
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(article);
            }
            else{
                err = new Error('not allowed');
                err.status = 404;
                return next(err);
            }
            
        }
    }, (err)=> next(err))
    .catch((err)=> next(err));
});
articleRouter.route('/:articleId/favorite')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, (req,res,next)=>{
    if(req.user.isFavorite(req.params.articleId)){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: true});
    }
    else{
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: false});
    }
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req,res,next)=>{
    if(req.user.isFavorite(req.params.articleId)){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: 'Already favorited'});
    }
    else{
        req.user.favorite(req.params.articleId)
        .then((user)=>{
            Article.findById(req.params.articleId).
            then((article)=>{
                article.updateFavoriteCount()
                .then((article)=>{
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(req.user.favorites);
                },(err)=> next(err))
                .catch((err)=> next(err));
            },(err)=> next(err))
            .catch((err)=> next(err));
        },(err)=> next(err))
        .catch((err)=> next(err));
        }
    });
articleRouter.route('/:articleId/unfavorite')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, (req,res,next)=>{
    if(req.user.isFavorite(req.params.articleId)){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: true});
    }
    else{
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: false});
    }
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req,res,next)=>{
    if(!req.user.isFavorite(req.params.articleId)){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({success: 'Already unfavorited'});
    }
    else{
        req.user.unfavorite(req.params.articleId)
        .then((user)=>{
            Article.findById(req.params.articleId).
            then((article)=>{
                article.updateFavoriteCount()
                .then((article)=>{
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(req.user.favorites);
                },(err)=> next(err))
                .catch((err)=> next(err));
            },(err)=> next(err))
            .catch((err)=> next(err));
        },(err)=> next(err))
        .catch((err)=> next(err));
        }
});

articleRouter.route('/:articleId/comments')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next)=>{
    Article.findById(req.params.articleId)
    .populate('comments.author')
    .then((article)=>{
        if(article != null) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(article.comments); 
        }
        else {
            err = new Error('Article ' + req.params.articleId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req,res,next)=>{
    Article.findById(req.params.articleId)
    .then((article)=>{
        if(article != null){
            console.log(req.user.username);
            req.body.author = req.user.username;
            article.comments = article.comments.concat([req.body]);
            article.save()
            .then((article)=>{
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(article);                
            }, (err) => next(err));
        }
        else {
            err = new Error('Article ' + req.params.articleId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})

articleRouter.route('/:articleId/comments/:commentId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req,res,next)=>{
    Article.findById(req.params.articleId)
    .populate('comments.author')
    .populate('author')
    .then((article)=>{
        if( article != null && 
          article.comments.id(req.params.commentId) != null)
            {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(article.comments.id(req.params.commentId));
            }
            else if (article == null) {
                err = new Error('Article ' + req.params.articleId + ' not found');
                err.status = 404;
                return next(err);
           }
            else {
                err = new Error('Comment ' + req.params.commentId + ' not found');
                err.status = 404;
                return next(err);            
            }
        }, (err) => next(err))
        .catch((err) => next(err)); 
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Article.findById(req.params.articleId)
    .then((article) => {
        if (article != null && article.comments.id(req.params.commentId) != null) {
            var id1 = req.user._id;
            var id2 = article.comments.id(req.params.commentId).author;
            
            console.log(id1);
            console.log(id2);
            if(id1.equals(id2)){
            article.comments.id(req.params.commentId).remove();
                article.save()
                .then((article) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(article);                
                }, (err) => next(err));      
        }
            else{
                err = new Error('Dusra ka comment hai bhai');
                err.status = 404;
                return next(err);
            }
        }
        else if (article == null) {
            err = new Error('Article ' + req.params.articleId + ' not found');
            err.status = 404;
            return next(err);
        }
        else {
            err = new Error('Comment ' + req.params.commentId + ' not found');
            err.status = 404;
            return next(err);            
        }
    }, (err) => next(err))
    .catch((err) => next(err));
});

module.exports = articleRouter;