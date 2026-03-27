import {
  Button,
  Typography,
  Tag,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconInfoCircle,
  IconGithub,
  IconHeart,
} from '@arco-design/web-react/icon';

const { Title, Text, Paragraph } = Typography;

interface AboutViewProps {
  onBack: () => void;
}

const AboutView = ({ onBack }: AboutViewProps) => {
  return (
    <div className="settings-detail">
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={onBack}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">关于</Title>
      
      <div className="settings-section" style={{ textAlign: 'center', padding: '40px 0' }}>
        <img 
          src="/icon.ico" 
          alt="Papyrus" 
          style={{ width: 80, height: 80, marginBottom: 16 }}
        />
        <Title heading={3} style={{ margin: '0 0 8px 0' }}>Papyrus</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>版本 1.0.0</Text>
        <Paragraph type="secondary" style={{ marginTop: 16, maxWidth: 400, margin: '16px auto 0' }}>
          SRS 复习引擎 - 基于间隔重复算法的智能记忆卡片应用
        </Paragraph>
        
        <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button 
            type="primary" 
            shape="round"
            onClick={() => {}}
          >
            检查更新
          </Button>
          <Button 
            shape="round"
            onClick={() => window.open('https://github.com/yourusername/papyrus', '_blank')}
          >
            <IconGithub style={{ marginRight: 8 }} />
            GitHub
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <Title heading={4} className="settings-section-title">致谢</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          感谢使用 Papyrus！本应用使用了以下开源项目：
        </Paragraph>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {['React', 'Arco Design', 'FastAPI', 'Python'].map(tech => (
            <Tag key={tech} color="arcoblue">{tech}</Tag>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <Title heading={4} className="settings-section-title">许可证</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Papyrus 采用 MIT 许可证开源。您可以自由使用、修改和分发本软件。
        </Paragraph>
      </div>

      <div className="settings-tip" style={{ marginTop: 24 }}>
        <IconHeart style={{ color: 'var(--color-danger)' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          如果喜欢这个项目，请在 GitHub 上给我们一个 Star ⭐
        </Text>
      </div>
    </div>
  );
};

export default AboutView;
