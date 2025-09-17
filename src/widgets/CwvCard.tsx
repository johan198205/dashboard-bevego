import { CwvStatus } from '@/lib/types';

type CwvCardProps = {
  title: string;
  value: string;
  target: string;
  status: CwvStatus;
  description?: string;
};

function getStatusColor(status: CwvStatus): string {
  switch (status) {
    case 'Pass':
      return 'text-green-600 bg-green-100';
    case 'Needs Improvement':
      return 'text-yellow-600 bg-yellow-100';
    case 'Fail':
      return 'text-red-600 bg-red-100';
  }
}

function getStatusText(status: CwvStatus): string {
  switch (status) {
    case 'Pass':
      return 'Pass';
    case 'Needs Improvement':
      return 'Behöver förbättring';
    case 'Fail':
      return 'Misslyckad';
  }
}

export default function CwvCard({ title, value, target, status, description }: CwvCardProps) {
  return (
    <div className="card">
      <div className="title mb-1">{title}</div>
      <div className="value">{value}</div>
      <div className="text-sm text-gray-600 mb-2">Mål: {target}</div>
      {description && <div className="text-xs text-gray-500 mb-2">{description}</div>}
      <div className="flex items-center gap-2 mb-2">
        <span className={`badge ${getStatusColor(status)}`}>
          {getStatusText(status)}
        </span>
      </div>
      <div className="mt-2">
        <span className="badge">Källa: Mock</span>
      </div>
    </div>
  );
}
