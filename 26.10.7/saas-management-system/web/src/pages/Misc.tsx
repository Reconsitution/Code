import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui';

export function Forbidden() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <Card padded>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--danger)' }}>403</div>
          <h3 style={{ margin: '10px 0 6px' }}>没有访问权限</h3>
          <p className="muted" style={{ margin: '0 0 16px' }}>
            当前账号的角色不包含访问该页面所需的权限。请联系平台管理员调整角色配置。
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            返回概览
          </button>
        </div>
      </Card>
    </div>
  );
}

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <Card padded>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--text-3)' }}>404</div>
          <h3 style={{ margin: '10px 0 6px' }}>页面不存在</h3>
          <p className="muted" style={{ margin: '0 0 16px' }}>
            你访问的地址没有对应的页面，可能是链接已失效。
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            返回概览
          </button>
        </div>
      </Card>
    </div>
  );
}
