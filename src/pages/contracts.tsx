import React, { useState } from 'react';
import {
    ArrowLeft, Copy, Check, ExternalLink, Play, Loader,
    Code, Zap, Gamepad2, Image, AlertCircle,
    type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChainGrpcWasmApi } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { NETWORK_CONFIG } from '../config';

const network = NETWORK_CONFIG.network === 'mainnet' ? Network.Mainnet : Network.Testnet;
const endpoints = getNetworkEndpoints(network);
const wasmApi = new ChainGrpcWasmApi(endpoints.grpc);

const EXPLORER_BASE = NETWORK_CONFIG.network === 'testnet'
    ? 'https://testnet.explorer.injective.network'
    : 'https://explorer.injective.network';

async function queryContract(address: string, msg: Record<string, any>) {
    const response = await wasmApi.fetchSmartContractState(address, msg);
    return JSON.parse(new TextDecoder().decode(response.data));
}

interface QueryDef {
    key: string;
    label: string;
    fn: () => Promise<any>;
}

interface ContractDef {
    key: string;
    name: string;
    description: string;
    address: string;
    icon: LucideIcon;
    colorClass: string;
    iconBgClass: string;
    queries: QueryDef[];
}

const contractCards: ContractDef[] = [
    {
        key: 'gameController',
        name: 'Game Controller',
        description: 'Core game logic — spins, breeding, harvesting, ascension, bonding curve minting, and reward distribution.',
        address: NETWORK_CONFIG.gameControllerAddress,
        icon: Gamepad2,
        colorClass: 'text-primary',
        iconBgClass: 'bg-primary/20',
        queries: [
            { key: 'gc-config', label: 'Config', fn: () => queryContract(NETWORK_CONFIG.gameControllerAddress, { config: {} }) },
            { key: 'gc-global', label: 'Global State', fn: () => queryContract(NETWORK_CONFIG.gameControllerAddress, { global_state: {} }) },
            { key: 'gc-stats', label: 'Game Stats', fn: () => queryContract(NETWORK_CONFIG.gameControllerAddress, { get_game_stats: {} }) },
            { key: 'gc-metrics', label: 'Ecosystem Metrics', fn: () => queryContract(NETWORK_CONFIG.gameControllerAddress, { get_ecosystem_metrics: {} }) },
            { key: 'gc-leaderboard', label: 'Leaderboard', fn: () => queryContract(NETWORK_CONFIG.gameControllerAddress, { get_leaderboard: {} }) },
            { key: 'gc-mint-price', label: 'Current Mint Price', fn: () => queryContract(NETWORK_CONFIG.gameControllerAddress, { get_current_mint_price: {} }) },
        ],
    },
    {
        key: 'cw721',
        name: 'CW721 Spore NFT',
        description: 'The NFT contract holding all mushroom tokens, their traits, genomes, and ownership records.',
        address: NETWORK_CONFIG.cw721Address,
        icon: Image,
        colorClass: 'text-purple-400',
        iconBgClass: 'bg-purple-500/20',
        queries: [
            { key: 'nft-info', label: 'Collection Info', fn: () => queryContract(NETWORK_CONFIG.cw721Address, { get_collection_info_and_extension: {} }) },
            { key: 'nft-count', label: 'Token Count', fn: () => queryContract(NETWORK_CONFIG.cw721Address, { num_tokens: {} }) },
            { key: 'nft-minter', label: 'Minter', fn: () => queryContract(NETWORK_CONFIG.cw721Address, { minter: {} }) },
        ],
    },
    {
        key: 'oracle',
        name: 'Drand Oracle',
        description: 'Stores and verifies drand quicknet BLS beacons for publicly verifiable on-chain randomness.',
        address: NETWORK_CONFIG.oracleAddress,
        icon: Zap,
        colorClass: 'text-blue-400',
        iconBgClass: 'bg-blue-500/20',
        queries: [
            { key: 'or-latest', label: 'Latest Beacon', fn: () => queryContract(NETWORK_CONFIG.oracleAddress, { latest_beacon: {} }) },
        ],
    },
];

interface QueryResult {
    loading: boolean;
    data: any | null;
    error: string | null;
}

export const Contracts: React.FC = () => {
    const [results, setResults] = useState<Record<string, QueryResult>>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const runQuery = async (queryKey: string, fn: () => Promise<any>) => {
        setResults(prev => ({ ...prev, [queryKey]: { loading: true, data: null, error: null } }));
        try {
            const data = await fn();
            setResults(prev => ({ ...prev, [queryKey]: { loading: false, data, error: null } }));
        } catch (err: any) {
            setResults(prev => ({
                ...prev,
                [queryKey]: { loading: false, data: null, error: err?.message || 'Query failed' },
            }));
        }
    };

    const copyAddress = (key: string, address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-20 animate-fade-in">

            {/* Header */}
            <div className="mb-12">
                <Link to="/" className="inline-flex items-center text-textSecondary hover:text-primary transition-colors mb-8 group">
                    <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Colony
                </Link>
                <div className="flex gap-4 items-center mb-6">
                    <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                        <Code size={32} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-text tracking-tight mb-2">
                            Smart Contracts
                        </h1>
                        <p className="text-xl text-textSecondary">
                            Explore and query the SporeFates protocol contracts on Injective {NETWORK_CONFIG.network}.
                        </p>
                    </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-full text-sm">
                        <Code size={14} className="text-primary" />
                        <span className="font-bold text-text">3</span>
                        <span className="text-textSecondary">Contracts</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-full text-sm">
                        <Zap size={14} className="text-blue-400" />
                        <span className="font-bold text-text capitalize">{NETWORK_CONFIG.network}</span>
                        <span className="text-textSecondary">Network</span>
                    </div>
                </div>
            </div>

            {/* Contract Cards */}
            <div className="space-y-8">
                {contractCards.map((contract) => {
                    const Icon = contract.icon;
                    return (
                        <section key={contract.key} className="bg-surface/50 backdrop-blur-sm rounded-3xl p-8 border border-border shadow-xl">
                            {/* Card Header */}
                            <div className="flex items-start gap-4 mb-6">
                                <div className={`p-3 rounded-xl ${contract.iconBgClass}`}>
                                    <Icon size={24} className={contract.colorClass} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-text">{contract.name}</h2>
                                    <p className="text-sm text-textSecondary mt-1">{contract.description}</p>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="mb-6 pb-5 border-b border-white/5">
                                <div className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-2">Contract Address</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <code className="text-sm font-mono text-text bg-background px-3 py-2 rounded-lg flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                        {contract.address}
                                    </code>
                                    <button
                                        onClick={() => copyAddress(contract.key, contract.address)}
                                        className="p-2 border border-border rounded-lg hover:border-primary/40 transition-colors"
                                        title="Copy address"
                                    >
                                        {copiedKey === contract.key ? (
                                            <Check size={14} className="text-green-400" />
                                        ) : (
                                            <Copy size={14} className="text-textSecondary" />
                                        )}
                                    </button>
                                    <a
                                        href={`${EXPLORER_BASE}/contract/${contract.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs font-semibold text-textSecondary hover:text-text hover:border-primary/40 transition-colors"
                                    >
                                        <ExternalLink size={13} />
                                        Explorer
                                    </a>
                                </div>
                            </div>

                            {/* Queries */}
                            <div>
                                <div className="text-[11px] font-bold text-textSecondary uppercase tracking-wider mb-3">Queries</div>
                                <div className="flex gap-2 flex-wrap mb-4">
                                    {contract.queries.map((q) => {
                                        const result = results[q.key];
                                        const isLoading = result?.loading;
                                        return (
                                            <button
                                                key={q.key}
                                                onClick={() => runQuery(q.key, q.fn)}
                                                disabled={isLoading}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all
                                                    ${result?.data ? 'border-green-500/30 bg-green-500/5' : result?.error ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-background'}
                                                    hover:border-primary/40 disabled:opacity-50`}
                                            >
                                                {isLoading ? (
                                                    <Loader size={13} className="text-textSecondary animate-spin" />
                                                ) : (
                                                    <Play size={13} className={contract.colorClass} />
                                                )}
                                                <span className="text-text">{q.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Results */}
                                {contract.queries.map((q) => {
                                    const result = results[q.key];
                                    if (!result || result.loading) return null;
                                    return (
                                        <div key={`result-${q.key}`} className="mb-3 rounded-xl border border-border overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-border">
                                                <span className="text-xs font-bold text-text">{q.label}</span>
                                                {result.error ? (
                                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
                                                        <AlertCircle size={12} /> Error
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400">
                                                        <Check size={12} /> Success
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-4 bg-background max-h-96 overflow-auto">
                                                {result.error ? (
                                                    <div className="text-sm text-red-400 font-mono">{result.error}</div>
                                                ) : (
                                                    <pre className="m-0">
                                                        <code className="text-xs font-mono text-blue-400 leading-relaxed whitespace-pre">
                                                            {JSON.stringify(result.data, null, 2)}
                                                        </code>
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Back to colony CTA */}
            <div className="mt-16 text-center">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 hover:scale-105"
                >
                    Enter the Colony <ArrowLeft className="rotate-180" size={18} />
                </Link>
            </div>
        </div>
    );
};
