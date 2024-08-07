project = "rekognition-image"
env = "uat"
layers = ["arn:aws:lambda:ap-southeast-1:451483290750:layer:NewRelicNodeJS20X:25"]
NEW_RELIC_ACCOUNT_ID = "4510480"
NEW_RELIC_USE_ESM = "true"
newrelic_handler = "newrelic-lambda-wrapper.handler"
face_detect_value = {
  "rekognitionImageConfig": {"multiface": false},
  "rekognitionImageScore": {
    "confidence": 99,
    "faceOccluded": {"value": false, "confidence": 99},
    "eyeDirection": {"confidence": 99},
    "eyeglasses": {"value": false, "confidence": 99},
    "sunglasses": {"value": false, "confidence": 99},
    "quality": [
      {"brightness": 60, "sharpness": 20},
      {"brightness": 40, "sharpness": 60},
      {"brightness": 30, "sharpness": 80}
    ]
  },
  "apiResponseCode": {
    "MWG_FACE_SUCCESS": {
      "code": "MWG_FACE_SUCCESS",
      "status": 200,
      "message": "Image accepted",
      "key": ""
    },
    "MWG_FACE_PARAMS_ERR": {
      "code": "MWG_FACE_PARAMS_ERR",
      "status": 400,
      "message": "Wrong parameters",
      "key": ""
    },
    "MWG_FACE_MULTIFACE_ERR": {
      "code": "MWG_FACE_MULTIFACE_ERR",
      "status": 501,
      "message": "Multiface not implemented",
      "key": ""
    },
    "MWG_FACE_MULTIFACE_ERR_200": {
      "code": "MWG_FACE_MULTIFACE_ERR",
      "status": 200,
      "message": "Expect single face, but multiface detected",
      "key": ""
    },
    "MWG_FACE_CONFIDENCE_ERR": {
      "code": "MWG_FACE_CONFIDENCE_ERR",
      "status": 200,
      "message": "Face quality is poor",
      "key": "confidence"
    },
    "MWG_FACE_OCCLUDED_ERR": {
      "code": "MWG_FACE_OCCLUDED_ERR",
      "status": 200,
      "message": "Face is occluded",
      "key": "faceOccluded"
    },
    "MWG_FACE_SUNGLASSES_ERR": {
      "code": "MWG_FACE_SUNGLASSES_ERR",
      "status": 200,
      "message": "Wearing a sunglasses",
      "key": "sunglasses"
    },
    "MWG_FACE_EYES_ERR": {
      "code": "MWG_FACE_EYES_ERR",
      "status": 200,
      "message": "Eyes quality are poor",
      "key": "eyeDirection"
    },
    "MWG_FACE_IMAGEQUALITY_ERR": {
      "code": "MWG_FACE_IMAGEQUALITY_ERR",
      "status": 200,
      "message": "Image quality is poor",
      "key": "quality"
    },
    "MWG_FACE_MULTISCORE_ERR": {
      "code": "MWG_FACE_MULTISCORE_ERR",
      "status": 200,
      "message": "Multiple poor score",
      "key": ""
    },
    "MWG_FACE_NOTDETECTED_ERR": {
      "code": "MWG_FACE_NOTDETECTED_ERR",
      "status": 200,
      "message": "No faces detected",
      "key": ""
    }
  }
}
