import { useState } from 'react';
import { dashboardApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { Alert, Badge, Card, Empty, Loading, Pager } from '../components/ui';
import { formatDateTime } from '../utils/format';
import type { AuditLog, Paged } from '../types';

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');

  const { data, loading, error } = useRequest<Paged<AuditLog>>(
    () => dashboardApi.auditLogs({ page, pageSize: 15, keyword }),
    [page, keyword]
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">审计日志</h1>
          <div className="page-desc">记录平台侧与租户侧的关键操作，用于安全审计与问题追溯。</div>
        </div>
      </div>

      <Card padded>
        <div className="row">
          <input
            className="input"
            style={{ width: 260 }}
            placeholder="搜索操作人 / 对象 / 动作"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
          <span className="spacer" />
          <span className="small muted">共 {data?.total ?? 0} 条</span>
        </div>
      </Card>

      <div style={{ marginTop: 14 }}>
        {error && <Alert>{error}</Alert>}
        <Card padded={false}>
          {loading ? (
            <Loading />
          ) : !data || data.items.length === 0 ? (
            <Empty text="暂无日志" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>操作人</th>
                      <th>动作</th>
                      <th>对象</th>
                      <th>所属租户</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((l) => (
                      <tr key={l.id}>
                        <td data-label="时间" className="small">
                          {formatDateTime(l.createdAt)}
                        </td>
                        <td data-label="操作人">
                          {l.actorName}
                          <div className="small muted">{l.actorEmail}</div>
                        </td>
                        <td data-label="动作">
                          <Badge tone="default">{l.actionLabel}</Badge>
                        </td>
                        <td data-label="对象">{l.target}</td>
                        <td data-label="所属租户">{l.tenantName || '-'}</td>
                        <td data-label="IP" className="mono small">
                          {l.ip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
