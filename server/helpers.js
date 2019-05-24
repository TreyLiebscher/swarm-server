const mongoose = require('mongoose');

function expressTryCatchWrapper(fn) {
    return async function (req, resp) {
        try {
            await fn(req, resp)
        } catch (ex) {
            console.error('expressTryCatch ERROR', ex)
            resp.status(500).json({ 
                message: 'SERVER_ERROR', 
                info:ex.toString() 
            })
        }
    }
}

function getFieldsFromRequest(fieldNamesArr, req) {
    const requestFieldNames = Object.keys(req.body)
    
    return fieldNamesArr.reduce((acc, fieldName) => {

        if (requestFieldNames.includes(fieldName)) {
            const value = req.body[fieldName]
            if (value !== undefined) {
                acc[fieldName] = value
            } 
        }
        return acc
    }, {})
}

async function deleteCollections(namesArr) {
    const collections = await mongoose.connection.db.collections()
    const filteredCollections = collections.filter(item => namesArr.includes(item.collectionName))
    return await Promise.all(filteredCollections.map(c => c.remove()))
}

module.exports = {
    expressTryCatchWrapper,
    getFieldsFromRequest,
    deleteCollections
}