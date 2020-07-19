const express      = require('express');
const {body}       = require('express-validator');

const router  = express.Router();

const isAuth    = require('../meddleWere/isAuth');

const adminController = require('../controllers/admin');


                                                      //routs


//auth
router.post('/login',[
  body('email')
  .not().isEmpty(),
  body('password')
  .not().isEmpty()
],adminController.postLogin);                                              //REST API

//admin pid manage

router.post('/start',isAuth,adminController.postStart);                    //REST API
router.post('/end',isAuth,adminController.postEnd);                        //REST API

//admin
router.get('',isAuth,adminController.getTest);                             //REST API
router.get('/support/f&q',isAuth,adminController.getFaQ);                  //REST API
router.post('/support/f&q',isAuth,[                                        //REST API
  body('answer')
  .not().isEmpty(),
  body('ask')
  .not().isEmpty()
],adminController.postFaQ);
router.post('/AQ/delete',isAuth,[                                          //REST API
  body('id')
  .not().isEmpty()
],adminController.deleteFaQ);           
router.post('/approve/:type',isAuth,adminController.postApprove);          //REST API
router.post('/disapprove/:type',isAuth,[                        
  body('id')
  .not().isEmpty(),
  body('note')
  .not().isEmpty()
],adminController.postdisApprove);                                         //REST API

router.post('/support',isAuth,[
    body('answer')
    .not().isEmpty(),
    body('id')
    .not().isEmpty()
],adminController.postSupport);                                            //REST API

router.post('/support/catigory',isAuth,[                                   //REST API
  body('name')
  .not().isEmpty()
],adminController.postCatigory);


router.post('/support/catigory/edit',isAuth,[
  body('name') 
  .not().isEmpty(),
  body('id') 
  .not().isEmpty()
],adminController.postEditCat);                                            //REST API

router.get('/support',isAuth,adminController.getSupport);                  //REST API
router.get('/catigory',isAuth,adminController.getCatigory);                //REST API
router.get('/singleProduct/:id',isAuth,adminController.getSingleProduct);  //REST API
router.get('/singleAsk/:id',isAuth,adminController.getSingleAsk);          //REST API
router.get('/products',isAuth,adminController.getProducts);                //REST API
router.get('/orders',isAuth,adminController.getOrders);                    //REST API
router.get('/users',isAuth,adminController.getUsers);                      //REST API
router.get('/singleUser/:id',isAuth,adminController.getSingleUsers);       //REST API
router.post('/delete/:type',isAuth,adminController.postDelete);            //REST API
router.get('/Ads',isAuth,adminController.getAds);                          //REST API
router.post('/ads/edit',[
  body('desc') 
  .not().isEmpty(),
  body('id') 
  .not().isEmpty()
],isAuth,adminController.postEditAds);                                     //REST API
router.post('/ads/delete',isAuth,adminController.postDeleteAds);           //REST API 
router.post('/ads/add',[
  body('desc') 
  .not().isEmpty(),
  body('type') 
  .not().isEmpty()
],isAuth,adminController.postAddAds);                                      //REST API
router.get('/lost',isAuth,adminController.getLost);                        //REST API
router.post('/lost/delete',isAuth,adminController.postDeleteLost);         //REST API

//pay
router.get('/pay',isAuth,adminController.getPay);                          //REST API

router.post('/pay/refuse/:action',[
  body('answer') 
  .not().isEmpty(),
  body('id') 
  .not().isEmpty()
],isAuth,adminController.postSendPayProduct);   

router.post('/pay/accept/:action',isAuth,adminController.postPay);         //REST API

//send notfication
router.post('/notfication',
[
  body('title') 
  .not().isEmpty(),
  body('body') 
  .not().isEmpty()
],isAuth,adminController.postSendNotfication);                             //REST API

//block
router.post('/block',[
  body('id') 
  .not().isEmpty(),
],isAuth,adminController.postBlock);                                       //REST API
                                      //Update Routs
//Search
router.get('/search',isAuth,adminController.getSearch);                    //REST API
//TotalBids manage
router.post('/product/TotalBids/edit',[
  body('id') 
  .not().isEmpty(),
  body('value') 
  .not().isEmpty(),
],isAuth,adminController.postTotalBid);                                    //REST API

router.post('/singleUser/notfication',[
  body('title') 
  .not().isEmpty(),
  body('body') 
  .not().isEmpty(),
  body('id') 
  .not().isEmpty(),
],isAuth,adminController.postSingleUserNotfication);                       //REST API

router.delete('/bid',[
  body('productId') 
  .not().isEmpty(),
],isAuth,adminController.deleteLastBid);                                   //REST API

router.delete('/pay/:type',[
  body('payId') 
  .not().isEmpty(),
],isAuth,adminController.deletePay);                                       //REST API

//Prize

router.post('/prize',[
  body('userName') 
  .not().isEmpty(),
  body('prizeName') 
  .not().isEmpty(),
  body('price') 
  .not().isEmpty()
  .isNumeric(),
],isAuth,adminController.prizePost);

router.get('/prize',isAuth,adminController.getPrize);

router.post('/prize/edit',[
  body('userName') 
  .not().isEmpty(),
  body('prizeName') 
  .not().isEmpty(),
  body('id') 
  .not().isEmpty(),
  body('price') 
  .not().isEmpty()
  .isNumeric(),
],isAuth,adminController.postEditPrize);

router.delete('/prize/delete',[
  body('id') 
  .not().isEmpty()
],isAuth,adminController.deletePrize);

router.post('/notfication/clear',isAuth,adminController.postClearNotfication);

module.exports = router;
