import { BackendConnector } from "./backendConnector";

const axiosBase = require('axios');
const fs = require('fs');
const FormData = require('form-data')

export type ResImage = {
  image_id: string
  file_name: string
  ext: string
  width: number
  height: number
  memo: string
  author: string
  created_at: string
  tags: string[]
  group_id: string
  is_group_thumb_nail: boolean
}

export type ResImages = {
  page: number
  images: ResImage[] | null
}

export class Image {
  static readonly IMAGE_SIZE_THUMBNAIL: string = "thumbnail";
  static readonly IMAGE_SIZE_ORIGINAL: string = "original";

  static readonly TAG_SEARCH_TYPE_AND :string = "and";
  static readonly TAG_SEARCH_TYPE_OR :string = "or";

  workspaceId: string
  accessToken: string

  constructor(workspaceId: string, accessToken: string) {
    this.workspaceId = workspaceId
    this.accessToken = accessToken
  }

  private authorizeAxiosBase(contentType: string) {
    let encodedString = Buffer.from(`${this.workspaceId}:${this.accessToken}`).toString('base64')
    let authorizeString = `Basic ${encodedString}`
    
    let axios = axiosBase.create({
      baseURL: BackendConnector.buildUrl('/api/v1/images'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorizeString
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      responseType: 'json'
    })
    if ( BackendConnector.loggingEnable ) {
      axios.interceptors.request.use((request:any) => {
        console.log('request: ', request)
        return request
      });
      axios.interceptors.response.use((response:any) => {
        console.log('response: ', response.data)
        return response
      });
    }
    return axios;
  }

  private authorizeAxios() {
    return this.authorizeAxiosBase('application/json')
  }

  private authorizeAxiosMultipart() {
    return this.authorizeAxiosBase('multipart/form-data')
  }

  public async create(filePathList: string[], imageUploadedCallBack: (finishNum: number, allNum: number)=>void) {
    try {
      for (let i = 0; i < filePathList.length; i++) {
        let filePath = filePathList[i]
        const params = new FormData();
        params.append('image', fs.createReadStream(filePath), filePath)
        await this.authorizeAxiosMultipart().post('/', params, { headers: params.getHeaders() } as any)
        imageUploadedCallBack(i + 1, filePathList.length)
      }
      return 0 // なんか返さないとasync/awaitが怪しい動きをする(はず)
    } catch (e) {
      console.log(`image post error [${e}]`)
      throw e
    }
  }

  public async getList(page: number, tagIds: string[], searchType: string): Promise<ResImages> {
    try {
      let params;
      if ( tagIds.length > 0 ) {
        let id_str = '';
        let comma = '';
        tagIds.forEach((id) => {
          id_str += `${comma}${id}`;
          comma = ',';
        });

        let type: string = searchType;
        if ( ![Image.TAG_SEARCH_TYPE_AND, Image.TAG_SEARCH_TYPE_OR].includes(type) ) type = Image.TAG_SEARCH_TYPE_AND;
        params = { page: page, tags: id_str, tag_search_type: type };
      } else {
        params = { page: page };
      }

      let res = await this.authorizeAxios().get('/', { params: params });
      return JSON.parse(JSON.stringify(res.data)) as ResImages
    } catch (e) {
      console.log(`image list get error [${e}]`)
      throw e
    }
  }

  public async getImage(imageId: string, imageSize: string): Promise<string> {
    try {
      let encodedString = Buffer.from(`${this.workspaceId}:${this.accessToken}`).toString('base64')
      let authorizeString = `Basic ${encodedString}`
      let res = await axiosBase.create({
        baseURL: BackendConnector.buildUrl(`/api/v1/images/${imageId}/file?image_size=${imageSize}`),
        responseType: 'arraybuffer',
        headers: {
          'Authorization': authorizeString,
          'Content-Type': 'image'
        },
      }).get()
      return res.data.toString('base64')
    } catch (e) {
      console.log(`image get error [${e}]`)
      throw e
    }
  }

  public async addTag(imageId: string, tagId: string) {
    try {
      let res = await this.authorizeAxios().patch(`/${imageId}/tags`, { tag_id: tagId })
      return;
    } catch (e) {
      console.log(`image add tag error [${e}]`)
      throw e
    }
  }

  public async removeTag(imageId: string, tagId: string) {
    try {
      // TODO: APIドキュメントを更新
      let res = await this.authorizeAxios().delete(`/${imageId}/tags/${tagId}`)
      return;
    } catch (e) {
      console.log(`image remove tag error [${e}]`)
      throw e
    }
  }

  public async addImagesToGroup(imageIds: string[]) {
    try {
      let res = await this.authorizeAxios().post(`/group`, { images: imageIds.join(',') })
      return JSON.parse(JSON.stringify(res.data)) as ResImages
    } catch (e) {
      console.log(`add images to group error [${e}]`)
      throw e
    }
  }

  public async deleteImagesFromGroup(groupId: string) {
    try {
      let res = await this.authorizeAxios().delete(`/group/${groupId}`)
      return;
    } catch (e) {
      console.log(`delete images from group error [${e}]`)
      throw e
    }
  }

  public async getGroupedImages(groupId: string) {
    try {
      let res = await this.authorizeAxios().get(`/group/${groupId}`)
      return JSON.parse(JSON.stringify(res.data)) as ResImages
    } catch (e) {
      console.log(`get grouped images error [${e}]`)
      throw e
    }
  }
}
