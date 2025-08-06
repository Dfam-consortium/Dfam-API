const fs = require('fs/promises');
const path = require('path');
const camelCase = require('camelcase');
const config = require('../config');
const logger = require('../logger');
const { verifySolution } = require('altcha-lib');


class Controller {
  static sendResponse(response, serviceResponse) {
    /**
    * The default response-code is 200. We want to allow to change that. in That case,
    * serviceResponse will be an object consisting of a code and a payload. If not customized
    * send 200 and the serviceResponse as received in this method.
    */
    response.status(serviceResponse.code || 200);

    // Dfam-API customizations
    if ( serviceResponse.attachment !== undefined ) {
      response.attachment(serviceResponse.attachment);
    }
    if ( serviceResponse.content_type !== undefined ) {
      response.type(serviceResponse.content_type);
    }
    if ( serviceResponse.encoding !== undefined ) {
      response.set('Content-Encoding', serviceResponse.encoding);
    }

    const responsePayload = serviceResponse.payload !== undefined ? serviceResponse.payload : serviceResponse;
    if (responsePayload instanceof Object) {
      // Dfam-API customizations
      if ( serviceResponse.encoding !== undefined ) {
        response.send(responsePayload);
      }else {
        response.json(responsePayload);
      }
    }else {
      response.end(responsePayload);
    }
  }

  static sendError(response, error) {
    response.status(error.code || 500);
    if (error.error instanceof Object) {
      response.json(error.error);
    } else {
      response.end(error.error || error.message);
    }
  }

  /**
  * Files have been uploaded to the directory defined by config.js as upload directory
  * Files have a temporary name, that was saved as 'filename' of the file object that is
  * referenced in request.files array.
  * This method finds the file and changes it to the file name that was originally called
  * when it was uploaded. To prevent files from being overwritten, a timestamp is added between
  * the filename and its extension
  * @param request
  * @param fieldName
  * @returns {string}
  */
  static async collectFile(request, fieldName) {
    let uploadedFileName = '';
    if (request.files && request.files.length > 0) {
      const fileObject = request.files.find(file => file.fieldname === fieldName);
      if (fileObject) {
        const fileArray = fileObject.originalname.split('.');
        const extension = fileArray.pop();
        fileArray.push(`_${Date.now()}`);
        uploadedFileName = `${fileArray.join('')}.${extension}`;
        await fs.rename(path.join(config.FILE_UPLOAD_PATH, fileObject.filename),
          path.join(config.FILE_UPLOAD_PATH, uploadedFileName));
      }
    }
    return uploadedFileName;
  }

  // Dfam-API : Note this uses a non-standard vendor extension to the OpenAPI spec.  It
  //            requires the use of x-codegen-request-body-name to refer to the function that
  //            will handle the service request.
  static getRequestBodyName(request) {
    const codeGenDefinedBodyName = request.openapi.schema['x-codegen-request-body-name'];
    if (codeGenDefinedBodyName !== undefined) {
      return codeGenDefinedBodyName;
    }
    const refObjectPath = request.openapi.schema.requestBody.content['application/json'].schema.$ref;
    if (refObjectPath !== undefined && refObjectPath.length > 0) {
      return (refObjectPath.substr(refObjectPath.lastIndexOf('/') + 1));
    }
    return 'body';
  }

  static collectRequestParams(request) {
    const requestParams = {};
    if (request.openapi.schema.requestBody !== null) {
      const { content } = request.openapi.schema.requestBody;
      if (content['application/json'] !== undefined) {
        const requestBodyName = camelCase(this.getRequestBodyName(request));
        requestParams[requestBodyName] = request.body;
      } else if (content['multipart/form-data'] !== undefined || content['application/x-www-form-urlencoded'] !== undefined) {
        let prop = '';
        if (content['multipart/form-data'] !== undefined) {
          prop = 'multipart/form-data';
        } else if (content['application/x-www-form-urlencoded'] !== undefined) {
          prop = 'application/x-www-form-urlencoded';
        }
        Object.keys(content[prop].schema.properties).forEach(
          (property) => {
            const propertyObject = content[prop].schema.properties[property];
            if (propertyObject.format !== undefined && propertyObject.format === 'binary') {
              requestParams[property] = this.collectFile(request, property);
            } else {
              requestParams[property] = request.body[property];
            }
          },
        );
      } 
    }

    if (request.openapi.schema.parameters !== undefined) {
      request.openapi.schema.parameters.forEach((param) => {
        if (param.in === 'path') {
          requestParams[param.name] = request.openapi.pathParams[param.name];
        } else if (param.in === 'query') {
          requestParams[param.name] = request.query[param.name];
        } else if (param.in === 'header') {
          requestParams[param.name] = request.headers[param.name];
        }
      });
    }

    return requestParams;
  }

  static async handleRequest(request, response, serviceOperation) {
    try {
      const start = new Date();
      let client_ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
      const serviceResponse = await serviceOperation(this.collectRequestParams(request));
      Controller.sendResponse(response, serviceResponse);
      // Dfam-API Customizations
      const time = new Date() - start;
      let urls = request.url.split("?");
      let endpoint = urls[0];
      let params = "";
      if (urls.length > 1) {
        params = urls[1];
      }
      logger.verbose({"method": request.method, "endpoint": endpoint, "params": params, "code": response.statusCode, "res_time": time, "client_ip": client_ip });
    } catch (error) {
      Controller.sendError(response, error);
      logger.error({error: error, url: request.url});
    }
  }

  // Dfam-API Custom handler
  static async handleAltchaRequest(request, response, serviceOperation) {
    try {
      const id = request.params.id;
      if ( config.REQUIRE_ALTCHA ) {
        const altcha_payload = request.body?.altcha_payload;
  
        if (!altcha_payload) {
          return response.status(400).json({
                  message: 'Private endpoint (status: 1)',
          });
        }

  
        const verified = await verifySolution(String(altcha_payload), config.ALTCHA_HMAC_KEY)

  
        if (!verified) {
          return response.status(403).json({
                 message: 'Private endpoint (status: 2)', });
        }
      }
      await this.handleRequest(request, response, serviceOperation);
    } catch (error) {
      Controller.sendError(response, error);
      logger.error({error: error, url: request.url});
    }
  }

  // Dfam-API Customizations
  static async handleStream(request, response, serviceOperation) {
    try {
      const start = new Date();
      await serviceOperation(request, response, this.collectRequestParams(request));
      const time = new Date() - start;
      logger.verbose(`${request.method} ${request.url} ${response.statusCode} ${time}ms`);
    } catch (error) {
      Controller.sendError(response, error);
      logger.error(error);
    }
  }
}

module.exports = Controller;
