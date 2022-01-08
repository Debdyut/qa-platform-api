const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const ServerError = require('../error/server.error');
const IdentityError = require('../error/identity.error');
const ValidationError = require('../error/validation.error');
const { validationResult } = require('express-validator');

exports.login = async (req, res) => {
    // #swagger.tags = ['User']
    // #swagger.description = 'Endpoint for user login.'

    /* #swagger.parameters['login-details'] = {
            in: 'body',
            description: 'User credentials for user login.',
            required: true,
            type: 'object',
            schema: { $ref: "#/definitions/UserAuthDtls" }
    } */

    const errors = validationResult(req);
    if (!errors.isEmpty()) {        
        throw new ValidationError(errors.array());   
    }

    const username = req.body['username'];
    const password = req.body['password'];
 
    let user;
    try {
        user = await User.findOne({ username: username }).exec();
    } catch(err) {
        throw new ServerError(err);
    }

    if (!user) {        
        throw new IdentityError('Sorry invalid credentials', 401);
    }
    
    let doMatch;
    try {
        doMatch = await bcrypt.compare(password, user.password);        
    } catch(err) {
        throw new ServerError(err);
    }

    if (!doMatch) {
        throw new IdentityError('Sorry invalid credentials', 401);
    }
    
    const token = jwt.sign(
        { user_id: user._id, email: user.username },
        "SECRET123",
        {
          expiresIn: "2h",
        }
    );

    // save user token
    user.token = token;
    try {
        await user.save();
    } catch(err) {
        throw new ServerError(err);
    }

    /* #swagger.responses[200] = { 
        schema: { $ref: "#/definitions/LoginSuccessResponse" },
        description: 'Login successful.' 
    } */
    return res.status(200).send({
        message: 'user logged in successfully',
        token: token,
        expiresIn: 7200
    });
}

exports.register = async (req, res) => {
    // #swagger.tags = ['User']
    // #swagger.description = 'Endpoint for user registration.'

    /* #swagger.parameters['user-details'] = {
            in: 'body',
            description: 'User credentials for user register.',
            required: true,
            type: 'object',
            schema: { $ref: "#/definitions/UserDtls" }
    } */

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError(errors.array());        
    }

    const fullName = req.body['registration-name'];
    const username = req.body['username'];
    const password = req.body['password'];

    let exisitingUser;
    try {
        exisitingUser = await User.findOne({ username: username });
    } catch(err) {
        throw new ServerError(err);
    }
    if (exisitingUser) {
        throw new ValidationError([
            {
                "value": username,
                "msg": "Provided email is already registered in the system.",
                "param": "username",
                "location": "body"
            }
        ]);
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
        fullName: fullName,
        username: username, 
        password: hashedPassword
    });

    let savedUser;
    try {
        savedUser = await user.save();
    } catch(err) {
        throw new ServerError(err);
    }

    /* #swagger.responses[201] = { 
        schema: { $ref: "#/definitions/RegisterSuccessResponse" },
        description: 'User registration successful.' 
    } */
    return res.status(201).send({
        message: 'User Registered Successfully',
        "registration-name": savedUser.fullName
    });
}