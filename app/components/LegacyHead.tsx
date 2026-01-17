import parse from 'html-react-parser';

type LegacyHeadProps = {
  headHtml: string;
};

export default function LegacyHead({ headHtml }: LegacyHeadProps) {
  if (!headHtml) return null;
  return <>{parse(headHtml)}</>;
}
