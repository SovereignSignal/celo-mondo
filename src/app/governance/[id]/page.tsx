'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { BackLink } from 'src/components/buttons/BackLink';
import { ExternalLink } from 'src/components/buttons/ExternalLink';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { Section } from 'src/components/layout/Section';
import { links } from 'src/config/links';
import { ProposalBadgeRow } from 'src/features/governance/components/ProposalCard';
import { ProposalUpvotersTable } from 'src/features/governance/components/ProposalUpvotersTable';
import {
  ProposalUpvoteButton,
  ProposalVoteButtons,
} from 'src/features/governance/components/ProposalVoteButtons';
import {
  ProposalQuorumChart,
  ProposalVoteChart,
} from 'src/features/governance/components/ProposalVoteChart';
import { ProposalVotersTable } from 'src/features/governance/components/ProposalVotersTable';
import {
  MergedProposalData,
  useGovernanceProposals,
} from 'src/features/governance/hooks/useGovernanceProposals';
import { useProposalContent } from 'src/features/governance/hooks/useProposalContent';
import { ProposalStage } from 'src/features/governance/types';
import { useWindowSize } from 'src/styles/mediaQueries';
import { usePageInvariant } from 'src/utils/navigation';
import { trimToLength } from 'src/utils/strings';
import { getHumanReadableDuration } from 'src/utils/time';
import styles from './styles.module.css';

const ID_PARAM_REGEX = /^(cgp-)?(\d+)$/;

export const dynamicParams = true;

export default function Page({ params: { id } }: { params: { id: string } }) {
  const { proposals } = useGovernanceProposals();

  const propData = useMemo(() => {
    if (!proposals || !id) return undefined;
    const matches = ID_PARAM_REGEX.exec(id);
    if (matches?.[1] === 'cgp-') {
      const cgpId = parseInt(matches[2]);
      return proposals.find((p) => p.metadata?.cgp === cgpId);
    } else if (matches?.[2]) {
      const propId = parseInt(matches[2]);
      return proposals.find((p) => p.proposal?.id === propId);
    } else {
      return undefined;
    }
  }, [proposals, id]);

  usePageInvariant(!proposals || propData, '/governance', 'Proposal not found');

  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  if (!propData) {
    return <FullWidthSpinner>Loading proposals</FullWidthSpinner>;
  }

  return (
    <Section containerClassName="mt-4 lg:flex lg:flex-row lg:gap-6">
      <ProposalContent propData={propData} />
      {propData.stage !== ProposalStage.None && (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white lg:static lg:bg-transparent">
          <button
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
            className="flex-center w-full space-x-4 border-y border-taupe-300 py-2 lg:hidden"
          >
            <span>{isMenuCollapsed ? 'More' : 'Less'}</span>
            <ChevronIcon direction={isMenuCollapsed ? 'n' : 's'} width={15} height={10} />
          </button>
          <div
            className={clsx(
              'transition-all duration-300',
              isMenuCollapsed ? 'max-h-0 lg:max-h-none' : 'max-h-screen lg:max-h-none',
            )}
          >
            <ProposalChainData propData={propData} />
          </div>
        </div>
      )}
    </Section>
  );
}

function ProposalContent({ propData }: { propData: MergedProposalData }) {
  const { proposal, metadata } = propData;
  const title = trimToLength(metadata?.title || `Proposal #${proposal?.id}`, 80);

  const { content, isLoading } = useProposalContent(metadata);

  return (
    <div className="space-y-3">
      <BackLink href="/governance">Browse proposals</BackLink>
      <h1 className="font-serif text-2xl md:text-2xl">{title}</h1>
      <ProposalBadgeRow data={propData} showProposer />
      {isLoading && !content && <FullWidthSpinner>Loading proposal content</FullWidthSpinner>}
      {!isLoading && !content && (
        <div className="flex flex-col items-start justify-center space-y-3 py-8">
          <p className="text-taupe-600">
            No valid CGP data found for this proposal. It may be missing or malformed.
          </p>
          <p className="text-taupe-600">You can still upvote and/or vote for this proposal.</p>
          <p className="text-taupe-600">
            See the{' '}
            <ExternalLink href={links.governance} className="underline">
              Celo Governance repository
            </ExternalLink>{' '}
            for more information.
          </p>
        </div>
      )}
      {content && (
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          className={`space-y-4 pb-4 ${styles.proposal}`}
        ></div>
      )}
    </div>
  );
}

function ProposalChainData({ propData }: { propData: MergedProposalData }) {
  const { id, stage, proposal } = propData;
  const expiryTimestamp = proposal?.expiryTimestamp;

  const windowSize = useWindowSize();
  const showTables = windowSize?.width && windowSize.width > 1024;

  if (stage === ProposalStage.None) return null;

  return (
    <div className="space-y-4 lg:min-w-[20rem]">
      <div className="space-y-4 border-taupe-300 p-3 lg:border">
        {stage === ProposalStage.Queued && <ProposalUpvoteButton proposalId={id} />}
        {stage === ProposalStage.Referendum && <ProposalVoteButtons proposalId={id} />}
        {expiryTimestamp && (
          <div>{`Expires in ${getHumanReadableDuration(expiryTimestamp - Date.now())}`}</div>
        )}
        {stage >= ProposalStage.Referendum && <ProposalVoteChart propData={propData} />}
        {stage === ProposalStage.Referendum && <ProposalQuorumChart propData={propData} />}
      </div>
      {showTables && stage >= ProposalStage.Queued && stage < ProposalStage.Referendum && (
        <div className="border-taupe-300 p-3 lg:border">
          <ProposalUpvotersTable propData={propData} />
        </div>
      )}
      {showTables && stage >= ProposalStage.Referendum && (
        <div className="overflow-auto border-taupe-300 p-3 lg:border">
          <ProposalVotersTable propData={propData} />
        </div>
      )}
    </div>
  );
}
