import { Close, FilterList, Search as SearchIcon } from "@mui/icons-material";
import {
	Badge,
	Button,
	CircularProgress,
	FormControl,
	Grid2,
	Grow,
	IconButton,
	MenuItem,
	Modal,
	NativeSelect,
	Select,
	Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import BreadcrumbsPageHeader from "@components/BreadcrumbsPageHeader";
import ItemCard from "@components/ItemCard";
import LazyLoad from "@components/LazyLoad";
import { useMemo, useState } from "react";

import { CatalogFilters } from "@components/Filters";
import { Empty } from "@components/Empty";
import { isCatalogItemMatchQuery } from "@utils/search";
import { useGetCatalogQuery, useGetItemsAvailabilityQuery } from "@api/shop/catalog";
import { useIsMobile } from "src/hooks/useIsMobile";
import { useFilters } from "src/hooks/useFilters";
import { Sorting } from "@appTypes/Sorting";
import { useItemsToRender } from "src/hooks/useItemsToRender";

export function Component() {
	const isMobile = useIsMobile();

	const navigate = useNavigate();
	const searchParams = useSearchParams();
	const query = searchParams[0].get("q") || "";

	const { data: catalog, isLoading: catalogIsLoading } = useGetCatalogQuery();
	const { data: availableItemIds } = useGetItemsAvailabilityQuery();

	const searchedItems = useMemo(() => {
		const searchedItems = catalog?.items.filter((item) => isCatalogItemMatchQuery(item, query)) || [];
		return searchedItems;
	}, [catalog, query]);

	const {
		filterGroupList,
		preorderList,

		availabilityFilter,
		handleToggleAvailabilityFilter,

		preorderIdFilter,
		handleChangePreorderIdFilter,

		checkedFilters,
		handleToggleFilter,

		priceRangeFilter,
		handleChangePriceRangeFilter,

		filterFunction,
		resetFilters,
	} = useFilters({ items: searchedItems, availableItemIds: availableItemIds || [] });
	const [filtersOpen, setFiltersOpen] = useState(false);

	const [sorting, setSorting] = useState<Sorting>("popular");

	const { itemsToRender } = useItemsToRender({ items: searchedItems, filterFunction, sorting });

	return (
		<>
			{catalogIsLoading ? (
				<div className="w-100 h-100 ai-c d-f jc-c">
					<CircularProgress />
				</div>
			) : searchedItems.length === 0 ? (
				<Empty
					title={`По запросу "${query}" ничего не найдено.`}
					description="Попробуйте изменить параметры поиска."
					icon={<SearchIcon sx={{ height: 96, width: 96 }} />}
					button={<Button onClick={() => navigate("/")}>На главную</Button>}
				/>
			) : (
				<div>
					<Modal open={filtersOpen} onClose={() => setFiltersOpen(false)}>
						<div className="top-0 left-0 bg-primary w-100v h-100v ai-fs d-f fd-c jc-fs of-a ps-f">
							<div className="px-2 w-100 h-9 ai-c d-f fd-r jc-sb">
								<IconButton>
									<Close sx={{ opacity: 0 }} />
								</IconButton>

								<Typography variant={"h6"}>Фильтры</Typography>

								<IconButton onClick={() => setFiltersOpen(false)}>
									<Close />
								</IconButton>
							</div>

							<CatalogFilters
								isMobile={isMobile}
								filterGroupList={filterGroupList}
								preorderList={preorderList}
								availabilityFilter={availabilityFilter}
								handleToggleAvailabilityFilter={handleToggleAvailabilityFilter}
								preorderIdFilter={preorderIdFilter}
								handleChangePreorderIdFilter={handleChangePreorderIdFilter}
								checkedFilters={checkedFilters}
								handleToggleFilter={handleToggleFilter}
								priceRangeFilter={priceRangeFilter}
								handleChangePriceRangeFilter={handleChangePriceRangeFilter}
							/>
						</div>
					</Modal>
					<BreadcrumbsPageHeader
						isMobile={isMobile}
						path={[{ title: "Главная", link: "/" }]}
						current={`Поиск по запросу "${query}"`}
					/>

					<div className="gap-2 d-f fd-r">
						{!isMobile && (
							<CatalogFilters
								isMobile={isMobile}
								filterGroupList={filterGroupList}
								preorderList={preorderList}
								availabilityFilter={availabilityFilter}
								handleToggleAvailabilityFilter={handleToggleAvailabilityFilter}
								preorderIdFilter={preorderIdFilter}
								handleChangePreorderIdFilter={handleChangePreorderIdFilter}
								checkedFilters={checkedFilters}
								handleToggleFilter={handleToggleFilter}
								priceRangeFilter={priceRangeFilter}
								handleChangePriceRangeFilter={handleChangePriceRangeFilter}
							/>
						)}

						<div className="gap-2 w-100 d-f fd-c">
							<div className="gap-1 ai-c d-f fd-r">
								<div className="w-100">
									<FormControl fullWidth>
										{isMobile ? (
											<NativeSelect
												value={sorting}
												onChange={(e) => {
													setSorting(e.target.value as Sorting);
												}}
											>
												<option value={"popular"}>Сначала популярные</option>
												<option value={"new"}>Сначала новые</option>
												<option value={"old"}>Сначала старые</option>
												<option value={"expensive"}>Сначала дорогие</option>
												<option value={"cheap"}>Сначала недорогие</option>
											</NativeSelect>
										) : (
											<Select
												labelId="demo-simple-select-label"
												id="demo-simple-select"
												value={sorting}
												onChange={(e) => {
													setSorting(e.target.value as Sorting);
												}}
												sx={{
													flexShrink: 0,
													width: isMobile ? "100%" : 360,
													backgroundColor: "surface.primary",
												}}
											>
												<MenuItem value={"popular"}>Сначала популярные</MenuItem>
												<MenuItem value={"new"}>Сначала новые</MenuItem>
												<MenuItem value={"old"}>Сначала старые</MenuItem>
												<MenuItem value={"expensive"}>Сначала дорогие</MenuItem>
												<MenuItem value={"cheap"}>Сначала недорогие</MenuItem>
											</Select>
										)}
									</FormControl>
								</div>

								{isMobile && (
									<IconButton
										style={{
											width: 48,
											height: 48,
										}}
										onClick={() => setFiltersOpen(!filtersOpen)}
									>
										<Badge color="warning" variant="dot" badgeContent={0}>
											<FilterList />
										</Badge>
									</IconButton>
								)}
							</div>

							{itemsToRender.length === 0 ? (
								<Empty
									title={"Ничего не найдено"}
									description="Попробуйте изменить фильтры"
									icon={<SearchIcon sx={{ height: 96, width: 96 }} />}
									button={
										<Button variant="contained" onClick={() => resetFilters()}>
											Сбросить фильтры
										</Button>
									}
								/>
							) : (
								<Grid2 container justifyContent="flex-start" spacing={2}>
									{itemsToRender.map((data, index) => (
										<Grid2 size={{ xl: 4, lg: 4, md: 6, sm: 6, xs: 12 }} key={index}>
											<LazyLoad
												key={index}
												width={"100%"}
												height={420}
												observerOptions={{
													rootMargin: "100px",
												}}
												once
											>
												<Grow key={index} in={true} timeout={200}>
													<div>
														<ItemCard data={data} />
													</div>
												</Grow>
											</LazyLoad>
										</Grid2>
									))}
								</Grid2>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
