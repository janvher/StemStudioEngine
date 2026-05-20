
export default interface BehaviorClassConfig {
    id: string;
    name?: string;
    main: string;
    isScript: boolean;
    attributes: Record<string, any>;
    worker?: boolean;
}
