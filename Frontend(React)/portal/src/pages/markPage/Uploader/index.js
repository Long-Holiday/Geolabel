import React, { Component } from 'react';
// import { Modal, Upload, Icon, Button, Progress } from 'antd';
import { Modal, Upload, Button, message } from 'antd';
import prettyBytes from 'pretty-bytes';
import styles from './index.less';
import { reqUploadShp as upload } from '@/services/map/api';
//import { injectIntl } from '@umijs/max';
import { CloudUploadOutlined, FolderAddOutlined, FolderOpenFilled } from '@ant-design/icons';

function noUseUploadFun() {
  return null;
}

function getFileExt(fileName) {
  try {
    return fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
  } catch (err) {
    return '';
  }
}

//@injectIntl
class Index extends Component {
  constructor(props) {
    super(props);
    this.state = {
      uploading: false,
      selectFileDone: false,
      fileInfo: {
        file: '',
        name: '',
        size: 0,
        type: '',
        header: [],
      },
      //progress: 0,
      importShp: '', //导入的geojson数据
    };
  }

  handleChange = (info) => {
    const { file } = info;
    let suffix = getFileExt(file.name);
    /* if ("csv" === suffix) {
          this.getCsvHeader(file.originFileObj)
        } */
    this.setState({
      selectFileDone: true,
      fileInfo: {
        file: file.originFileObj,
        name: file.name,
        size: file.size,
        type: suffix,
      },
    });
  };

  handleCancle = () => {
    this.props.onUploadStatusChange(false);
  };

  handleUpload = () => {
    message.loading('正在导入数据');
    this.setState({
      uploading: true,
    });
    const fields = {
      shp: this.state.fileInfo.file,
      // description: formValues.description,
    };
    const formData = new FormData();

    Object.keys(fields).forEach((item) => {
      if (fields[item] !== undefined) {
        formData.append(item, fields[item]);
      }
    });
    for (var [a, b] of formData.entries()) {
      console.log(a, b);
    }
    // return;
    upload(formData)
      .then((res) => {
        console.log(res.data.json, '响应res');
        this.setState({
          uploading: false,
          selectFileDone: false,
          fileInfo: {
            file: '',
            name: '',
            size: 0,
            type: '',
            header: [],
          },
          //progress: 0,
        });
        //将响应的数据传给父组件
        this.props.getShp(res.data.json);
        this.props.onUploadStatusChange(false);
        message.success('导入数据成功！');
      })
      .catch((err) => {
        console.log(err);
        this.setState({
          uploading: false,
          //progress: 0
        });
        message.error('导入数据失败');
        // this.props.onUploadStatusChange(false);
      });
  };

  render() {
    //const { intl } = this.props;
    let SelectFileComp;
    let SubmitFormComp;
    if (!this.state.selectFileDone) {
      SelectFileComp = (
        <div>
          <div className={styles.uploader}>
            <div className={styles.uploadIcon}>
              <p>
                <CloudUploadOutlined style={{ fontSize: '4em' }} />
                {/*<Icon type="cloud-upload" />*/}
              </p>
              <p>{'导入shpfile文件'}</p>
            </div>
            <div>
              {/* <a href="#">
                <Button icon="appstore" type="primary">
                  上传shp(调起客户端)
                </Button>
              </a> */}
              <Upload
                customRequest={noUseUploadFun}
                showUploadList={false}
                onChange={this.handleChange}
                // accept=".zip,.csv,.json,.geojson"
                accept=".zip"
              >
                <Button type="primary">
                  <FolderOpenFilled style={{ color: 'white' }} />
                  {/*<Icon type="folder-open" theme="filled" style={{ color: 'white' }} />*/}
                  {'选择文件'}
                </Button>
              </Upload>
            </div>
          </div>
          <div className={styles.limit}>
            <div>{'只支持导入zip文件'} </div>
            {/* <p>如果没有安装客户端，请先下载安装。</p> */}
          </div>
        </div>
      );
    } else {
      const { fileInfo, uploading } = this.state;
      const fileName = fileInfo.name;
      const FileInfoComp = (
        <div className={styles.fileInfo}>
          <div className={styles.choose}>选择的文件：</div>
          <div className={styles.info}>
            <span>
              {/*<Icon type="file-add" />*/}
              <FolderAddOutlined />
              <strong> {fileName}</strong>
            </span>
            <span>{prettyBytes(fileInfo.size)}</span>
          </div>
        </div>
      );

      const fileNameWithoutExt = fileName.replace(/\.(\w*)$/, '');

      SubmitFormComp = (
        <div className={styles.form}>
          {FileInfoComp}
          <Button type="primary" onClick={this.handleUpload}>
            提交
          </Button>
          <Button
            onClick={() => {
              this.setState({ selectFileDone: false });
            }}
          >
            取消
          </Button>
          {/* {this.state.progress > 0 && <Progress percent={this.state.progress} />} */}
        </div>
      );
    }

    return (
      <Modal
        title={'请选择文件'}
        maskClosable={false}
        footer={null}
        open={true}
        onCancel={this.handleCancle}
      >
        {this.state.selectFileDone ? SubmitFormComp : SelectFileComp}
      </Modal>
    );
  }
}

export default Index;
