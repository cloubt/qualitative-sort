/*
 * timsort Javascript (typescript edition)
 *
 * Licensed under GPL 3 ( http://www.gnu.org/licenses/gpl.html ) license.
 *
 */
export { timsort, arraycopy }

async function timsort<T>(arr: T[], compareFn: ((a: T, b: T) => Promise<number>)) : Promise<T[]> {
	
	let global_a: T[] = arr;
	let MIN_MERGE: number = 32;
	let MIN_GALLOP: number = 7
	let runBase: number[] = [];
	let runLen: number[] = [];
	let stackSize = 0;
	let compare = compareFn;

	await sort(global_a, 0, arr.length, compare);
	return global_a;

	/*
         * The next two methods (which are package private and static) constitute the entire API of this class. Each of these methods
         * obeys the contract of the public method with the same signature in java.util.Arrays.
         */

	async function sort (a: T[], lo: number, hi: number, compare: typeof compareFn) {
		console.log("entering sort")
		if (typeof compare != "function") {
			throw new Error("Compare is not a function.");
		}

		stackSize = 0;
		runBase = [];
		runLen = [];
		
		rangeCheck(a.length, lo, hi);
		let nRemaining = hi - lo;
		if (nRemaining < 2) return; // Arrays of size 0 and 1 are always sorted

		// If array is small, do a "mini-TimSort" with no merges
		if (nRemaining < MIN_MERGE) {
			let initRunLen: number = await countRunAndMakeAscending(a, lo, hi, compare)
			await binarySort(a, lo, hi, lo + initRunLen, compare);
			return;
		}


		//-----------------------------------------------------------------------------


		/**
                 * March over the array once, left to right, finding natural runs, extending short natural runs to minRun elements, and
                 * merging runs to maintain stack invariant.
                 */
		let ts = [];
		let minRun = minRunLength(nRemaining);
		do {
			// Identify next run
			let runLenlet = await countRunAndMakeAscending(a, lo, hi, compare);

			// If run is short, extend to min(minRun, nRemaining)
			if (runLenlet < minRun) {
				let force = nRemaining <= minRun ? nRemaining : minRun;
				await binarySort(a, lo, lo + force, lo + runLenlet, compare);
				runLenlet = force;
			}

			// Push run onto pending-run stack, and maybe merge
			pushRun(lo, runLenlet);
			mergeCollapse();

			// Advance to find next run
			lo += runLenlet;
			nRemaining -= runLenlet;
		} while (nRemaining != 0);

		// Merge all remaining runs to complete sort
		mergeForceCollapse();
	}


	/**
         * Sorts the specified portion of the specified array using a binary insertion sort. This is the best method for sorting small
         * numbers of elements. It requires O(n log n) compares, but O(n^2) data movement (worst case).
         *
         * If the initial part of the specified range is already sorted, this method can take advantage of it: the method assumes that
         * the elements from index {@code lo}, inclusive, to {@code start}, exclusive are already sorted.
         *
         * @param a the array in which a range is to be sorted
         * @param lo the index of the first element in the range to be sorted
         * @param hi the index after the last element in the range to be sorted
         * @param start the index of the first element in the range that is not already known to be sorted (@code lo <= start <= hi}
         * @param c comparator to used for the sort
         */
	async function binarySort (a: T[], lo: number, hi: number, start: number, compare: typeof compareFn) {
		console.log("entering binary sort")
		if (start == lo) start++;
		for (; start < hi; start++) {
			let pivot = a[start];

			// Set left (and right) to the index where a[start] (pivot) belongs
			let left = lo;
			let right = start;
			/*
			* invariants: pivot >= all in [lo, left). pivot < all in [right, start).
			*/
			while (left < right) {
				let mid = (left + right) >>> 1;
				let comparison = await compare(pivot, a[mid]);
				if (comparison < 0)
					right = mid;
				else
					left = mid + 1;
			}
			/*
			* The invariants still hold: pivot >= all in [lo, left) and pivot < all in [left, start), so pivot belongs at left. Note
			* that if there are elements equal to pivot, left points to the first slot after them -- that's why this sort is stable.
			* Slide elements over to make room to make room for pivot.
			*/
			let n = start - left; // The number of elements to move
			// Switch is just an optimization for arraycopy in default case
			switch (n) {
			case 2:
				a[left + 2] = a[left + 1];
			case 1:
				a[left + 1] = a[left];
				break;
			default:
			arraycopy(a, left, a, left + 1, n);
			}
			a[left] = pivot;
			console.log("done");
		}
	}
	
	
	/**
         * Returns the length of the run beginning at the specified position in the specified array and reverses the run if it is
         * descending (ensuring that the run will always be ascending when the method returns).
         *
         * A run is the longest ascending sequence with:
         *
         * a[lo] <= a[lo + 1] <= a[lo + 2] <= ...
         *
         * or the longest descending sequence with:
         *
         * a[lo] > a[lo + 1] > a[lo + 2] > ...
         *
         * For its intended use in a stable mergesort, the strictness of the definition of "descending" is needed so that the call can
         * safely reverse a descending sequence without violating stability.
         *
         * @param a the array in which a run is to be counted and possibly reversed
         * @param lo index of the first element in the run
         * @param hi index after the last element that may be contained in the run. It is required that @code{lo < hi}.
         * @param c the comparator to used for the sort
         * @return the length of the run beginning at the specified position in the specified array
         */
	async function countRunAndMakeAscending (a: T[], lo: number, hi: number, compare: typeof compareFn) {
		console.log("entering count run and make ascending")
		let runHi = lo + 1;
		if (runHi === hi) {
			return 1;
		}

		// Find end of run, and reverse range if descending
		if (await compare(a[runHi++], a[lo]) < 0) { // Descending
			while (runHi < hi && await compare(a[runHi], a[runHi - 1]) < 0){
				runHi++;
			}
			reverseRange(a, lo, runHi);
		} else { // Ascending
			while (runHi < hi && await compare(a[runHi], a[runHi - 1]) >= 0){
				runHi++;
			}
		}

		return runHi - lo;
	}

	/**
         * Reverse the specified range of the specified array.
         *
         * @param a the array in which a range is to be reversed
         * @param lo the index of the first element in the range to be reversed
         * @param hi the index after the last element in the range to be reversed
         */
	function /*private static void*/ reverseRange (/*Object[]*/ a: T[], /*int*/ lo: number, /*int*/ hi: number) {
		hi--;
		while (lo < hi) {
			let t = a[lo];
			a[lo++] = a[hi];
			a[hi--] = t;
		}
	}

	
	/**
         * Returns the minimum acceptable run length for an array of the specified length. Natural runs shorter than this will be
         * extended with {@link #binarySort}.
         *
         * Roughly speaking, the computation is:
         *
         * If n < MIN_MERGE, return n (it's too small to bother with fancy stuff). Else if n is an exact power of 2, return
         * MIN_MERGE/2. Else return an int k, MIN_MERGE/2 <= k <= MIN_MERGE, such that n/k is close to, but strictly less than, an
         * exact power of 2.
         *
         * For the rationale, see listsort.txt.
         *
         * @param n the length of the array to be sorted
         * @return the length of the minimum run to be merged
         */
	function /*private static int*/ minRunLength (/*int*/ n: number) {
		//let v=0;
		let r = 0; // Becomes 1 if any 1 bits are shifted off
		/*while (n >= MIN_MERGE) { v++;
			r |= (n & 1);
			n >>= 1;
		}*/
		//console.log("minRunLength("+n+") "+v+" vueltas, result="+(n+r));
		//return n + r;
		return n + 1;
	}

	/**
         * Pushes the specified run onto the pending-run stack.
         *
         * @param runBase index of the first element in the run
         * @param runLen the number of elements in the run
         */
	function pushRun (runBaseArg: number, runLenArg: number) {
		//console.log("pushRun("+runBaseArg+","+runLenArg+")");
		//this.runBase[stackSize] = runBase;
		//runBase.push(runBaseArg);
		runBase[stackSize] = runBaseArg;
		
		//this.runLen[stackSize] = runLen;
		//runLen.push(runLenArg);
		runLen[stackSize] = runLenArg;
		stackSize++;
	}

	/**
         * Examines the stack of runs waiting to be merged and merges adjacent runs until the stack invariants are reestablished:
         *
         * 1. runLen[i - 3] > runLen[i - 2] + runLen[i - 1] 2. runLen[i - 2] > runLen[i - 1]
         *
         * This method is called each time a new run is pushed onto the stack, so the invariants are guaranteed to hold for i <
         * stackSize upon entry to the method.
         */
	function mergeCollapse () {
		while (stackSize > 1) {
			let n = stackSize - 2;
			if (n > 0 && runLen[n - 1] <= runLen[n] + runLen[n + 1]) {
				if (runLen[n - 1] < runLen[n + 1]) n--;
				mergeAt(n);
			} else if (runLen[n] <= runLen[n + 1]) {
				mergeAt(n);
			} else {
				break; // invariant is established
			}
		}
	}

	/**
         * Merges all runs on the stack until only one remains. This method is called once, to complete the sort.
         */
	function mergeForceCollapse () {
		while (stackSize > 1) {
			let n = stackSize - 2;
			if (n > 0 && runLen[n - 1] < runLen[n + 1]) n--;
			mergeAt(n);
		}
	}
	
	
	/**
         * Merges the two runs at stack indices i and i+1. Run i must be the penultimate or antepenultimate run on the stack. In other
         * words, i must be equal to stackSize-2 or stackSize-3.
         *
         * @param i stack index of the first of the two runs to merge
         */
	async function mergeAt (i: number) {
		console.log("entering mergeat")

		let base1 = runBase[i];
		let len1 = runLen[i];
		let base2 = runBase[i + 1];
		let len2 = runLen[i + 1];

		/*
		* Record the length of the combined runs; if i is the 3rd-last run now, also slide over the last run (which isn't involved
		* in this merge). The current run (i+1) goes away in any case.
		*/
		//let stackSize = runLen.length;
		runLen[i] = len1 + len2;
		if (i == stackSize  - 3) {
			runBase[i + 1] = runBase[i + 2];
			runLen[i + 1] = runLen[i + 2];
		}
		stackSize--;

		/*
		* Find where the first element of run2 goes in run1. Prior elements in run1 can be ignored (because they're already in
		* place).
		*/

		let k = await gallopRight(global_a[base2], global_a, base1, len1, 0, compare);
		base1 += k;
		len1 -= k;
		if (len1 == 0) return;

		/*
		* Find where the last element of run1 goes in run2. Subsequent elements in run2 can be ignored (because they're already in
		* place).
		*/
		len2 = await gallopLeft(global_a[base1 + len1 - 1], global_a, base2, len2, len2 - 1, compare);

		if (len2 == 0) return;

		// Merge remaining runs, using tmp array with min(len1, len2) elements
		if (len1 <= len2)
			mergeLo(base1, len1, base2, len2);
		else
			mergeHi(base1, len1, base2, len2);
	}

	
	/**
         * Locates the position at which to insert the specified key into the specified sorted range; if the range contains an element
         * equal to key, returns the index of the leftmost equal element.
         *
         * @param key the key whose insertion point to search for
         * @param a the array in which to search
         * @param base the index of the first element in the range
         * @param len the length of the range; must be > 0
         * @param hint the index at which to begin the search, 0 <= hint < n. The closer hint is to the result, the faster this method
         *           will run.
         * @param c the comparator used to order the range, and to search
         * @return the int k, 0 <= k <= n such that a[b + k - 1] < key <= a[b + k], pretending that a[b - 1] is minus infinity and a[b
         *         + n] is infinity. In other words, key belongs at index b + k; or in other words, the first k elements of a should
         *         precede key, and the last n - k should follow it.
         */
	async function gallopLeft (key: T, a: T[], base: number, len: number, hint: number, compare: typeof compareFn) {
		console.log("entering gallop left")
		let lastOfs = 0;
		let ofs = 1;
		if (await compare(key, a[base + hint]) > 0) {
			// Gallop right until a[base+hint+lastOfs] < key <= a[base+hint+ofs]
			let maxOfs = len - hint;
			while (ofs < maxOfs && await compare(key, a[base + hint + ofs]) > 0) {
				lastOfs = ofs;
				ofs = (ofs << 1) + 1;
				if (ofs <= 0) // int overflow
					ofs = maxOfs;
			}
			if (ofs > maxOfs) ofs = maxOfs;

			// Make offsets relative to base
			lastOfs += hint;
			ofs += hint;
		} else { // key <= a[base + hint]
			// Gallop left until a[base+hint-ofs] < key <= a[base+hint-lastOfs]
			let maxOfs = hint + 1;
			while (ofs < maxOfs && await compare(key, a[base + hint - ofs]) <= 0) {
				lastOfs = ofs;
				ofs = (ofs << 1) + 1;
				if (ofs <= 0) // int overflow
					ofs = maxOfs;
			}
			if (ofs > maxOfs) ofs = maxOfs;

			// Make offsets relative to base
			let tmp = lastOfs;
			lastOfs = hint - ofs;
			ofs = hint - tmp;
		}

		/*
		* Now a[base+lastOfs] < key <= a[base+ofs], so key belongs somewhere to the right of lastOfs but no farther right than ofs.
		* Do a binary search, with invariant a[base + lastOfs - 1] < key <= a[base + ofs].
		*/
		lastOfs++;
		while (lastOfs < ofs) {
			let m = lastOfs + ((ofs - lastOfs) >>> 1);

			if (await compare(key, a[base + m]) > 0)
				lastOfs = m + 1; // a[base + m] < key
			else
				ofs = m; // key <= a[base + m]
		}
		return ofs;
	}
	
	/**
         * Like gallopLeft, except that if the range contains an element equal to key, gallopRight returns the index after the
         * rightmost equal element.
         *
         * @param key the key whose insertion point to search for
         * @param a the array [] in which to search
         * @param base the index of the first element in the range
         * @param len the length of the range; must be > 0
         * @param hint the index at which to begin the search, 0 <= hint < n. The closer hint is to the result, the faster this method
         *           will run.
         * @param c the comparator used to order the range, and to search
         * @return the int k, 0 <= k <= n such that a[b + k - 1] <= key < a[b + k]
         */
	async function gallopRight (key: T, a: T[], base: number, len: number, hint: number, compare: typeof compareFn) {
		console.log("entering gallop right")

		let ofs = 1;
		let lastOfs = 0;
		if (await compare(key, a[base + hint]) < 0) {
			// Gallop left until a[b+hint - ofs] <= key < a[b+hint - lastOfs]
			let maxOfs = hint + 1;
			while (ofs < maxOfs && await compare(key, a[base + hint - ofs]) < 0) {
				lastOfs = ofs;
				ofs = (ofs << 1) + 1;
				if (ofs <= 0) // int overflow
					ofs = maxOfs;
			}
			if (ofs > maxOfs) ofs = maxOfs;

			// Make offsets relative to b
			let tmp = lastOfs;
			lastOfs = hint - ofs;
			ofs = hint - tmp;
		} else { // a[b + hint] <= key
			// Gallop right until a[b+hint + lastOfs] <= key < a[b+hint + ofs]
			let maxOfs = len - hint;
			while (ofs < maxOfs && await compare(key, a[base + hint + ofs]) >= 0) {
				lastOfs = ofs;
				ofs = (ofs << 1) + 1;
				if (ofs <= 0) // int overflow
					ofs = maxOfs;
			}
			if (ofs > maxOfs) ofs = maxOfs;

			// Make offsets relative to b
			lastOfs += hint;
			ofs += hint;
		}

		/*
		* Now a[b + lastOfs] <= key < a[b + ofs], so key belongs somewhere to the right of lastOfs but no farther right than ofs.
		* Do a binary search, with invariant a[b + lastOfs - 1] <= key < a[b + ofs].
		*/
		lastOfs++;
		while (lastOfs < ofs) {
			let m = lastOfs + ((ofs - lastOfs) >>> 1);

			if (await compare(key, a[base + m]) < 0)
				ofs = m; // key < a[b + m]
			else
				lastOfs = m + 1; // a[b + m] <= key
		}
		return ofs;
	}
	
	/**
	* Merges two adjacent runs in place, in a stable fashion. The first element of the first run must be greater than the first
	* element of the second run (a[base1] > a[base2]), and the last element of the first run (a[base1 + len1-1]) must be greater
	* than all elements of the second run.
	*
	* For performance, this method should be called only when len1 <= len2; its twin, mergeHi should be called if len1 >= len2.
	* (Either method may be called if len1 == len2.)
	*
	* @param base1 index of first element in first run to be merged
	* @param len1 length of first run to be merged (must be > 0)
	* @param base2 index of first element in second run to be merged (must be aBase + aLen)
	* @param len2 length of second run to be merged (must be > 0)
	*/
	async function mergeLo (base1: number, len1: number, base2: number, len2: number) {
		console.log("entering merge lo")

		// Copy first run into temp array
		let a = global_a;// For performance
		let tmp=a.slice(base1,base1+len1);
		let cursor1 = 0; // Indexes into tmp array
		let cursor2 = base2; // Indexes int a
		let dest = base1; // Indexes int a

		// Move first element of second run and deal with degenerate cases
		a[dest++] = a[cursor2++];
		if (--len2 == 0) {
			arraycopy(tmp, cursor1, a, dest, len1);
			return;
		}
		if (len1 == 1) {
			arraycopy(a, cursor2, a, dest, len2);
			a[dest + len2] = tmp[cursor1]; // Last elt of run 1 to end of merge
			return;
		}

		let c = compare;// Use local letiable for performance
		
		let minGallop = MIN_GALLOP; // "    " "     " "
		outer:
		while (true) {
			let count1 = 0; // Number of times in a row that first run won
			let count2 = 0; // Number of times in a row that second run won

			/*
			* Do the straightforward thing until (if ever) one run starts winning consistently.
			*/
			do {
				if (await compare(a[cursor2], tmp[cursor1]) < 0) {
					a[dest++] = a[cursor2++];
					count2++;
					count1 = 0;
					if (--len2 == 0) break outer;
				} else {
					a[dest++] = tmp[cursor1++];
					count1++;
					count2 = 0;
					if (--len1 == 1) break outer;
				}
			} while ((count1 | count2) < minGallop);

			/*
			* One run is winning so consistently that galloping may be a huge win. So try that, and continue galloping until (if
			* ever) neither run appears to be winning consistently anymore.
			*/
			do {
				count1 = await gallopRight(a[cursor2], tmp, cursor1, len1, 0, c);
				if (count1 != 0) {
					arraycopy(tmp, cursor1, a, dest, count1);
					dest += count1;
					cursor1 += count1;
					len1 -= count1;
					if (len1 <= 1) // len1 == 1 || len1 == 0
						break outer;
				}
				a[dest++] = a[cursor2++];
				if (--len2 == 0) break outer;

				count2 = await gallopLeft(tmp[cursor1], a, cursor2, len2, 0, c);
				if (count2 != 0) {
					arraycopy(a, cursor2, a, dest, count2);
					dest += count2;
					cursor2 += count2;
					len2 -= count2;
					if (len2 == 0) break outer;
				}
				a[dest++] = tmp[cursor1++];
				if (--len1 == 1) break outer;
				minGallop--;
			} while (count1 >= MIN_GALLOP || count2 >= MIN_GALLOP);
			if (minGallop < 0) minGallop = 0;
			minGallop += 2; // Penalize for leaving gallop mode
		} // End of "outer" loop
		minGallop = minGallop < 1 ? 1 : minGallop; // Write back to field

		if (len1 == 1) {
			arraycopy(a, cursor2, a, dest, len2);
			a[dest + len2] = tmp[cursor1]; // Last elt of run 1 to end of merge
		} else if (len1 == 0) {
			throw new Error("IllegalArgumentException. Comparison method violates its general contract!");
		} else {
			arraycopy(tmp, cursor1, a, dest, len1);
		}
	}


	/**
         * Like mergeLo, except that this method should be called only if len1 >= len2; mergeLo should be called if len1 <= len2.
         * (Either method may be called if len1 == len2.)
         *
         * @param base1 index of first element in first run to be merged
         * @param len1 length of first run to be merged (must be > 0)
         * @param base2 index of first element in second run to be merged (must be aBase + aLen)
         * @param len2 length of second run to be merged (must be > 0)
         */
	async function mergeHi (base1: number, len1: number, base2: number, len2: number) {
		console.log("entering merge hi")
	
		// Copy second run into temp array
		let a = global_a;// For performance
		let tmp=a.slice(base2, base2+len2);

		let cursor1 = base1 + len1 - 1; // Indexes into a
		let cursor2 = len2 - 1; // Indexes into tmp array
		let dest = base2 + len2 - 1; // Indexes into a

		// Move last element of first run and deal with degenerate cases
		a[dest--] = a[cursor1--];
		if (--len1 == 0) {
			arraycopy(tmp, 0, a, dest - (len2 - 1), len2);
			return;
		}
		if (len2 == 1) {
			dest -= len1;
			cursor1 -= len1;
			arraycopy(a, cursor1 + 1, a, dest + 1, len1);
			a[dest] = tmp[cursor2];
			return;
		}

		let c = compare;// Use local letiable for performance
		
		let minGallop = MIN_GALLOP; // "    " "     " "
		outer:
		while (true) {
			let count1 = 0; // Number of times in a row that first run won
			let count2 = 0; // Number of times in a row that second run won

			/*
			* Do the straightforward thing until (if ever) one run appears to win consistently.
			*/
			do {
				if (await compare(tmp[cursor2], a[cursor1]) < 0) {
					a[dest--] = a[cursor1--];
					count1++;
					count2 = 0;
					if (--len1 == 0) break outer;
					} else {
						a[dest--] = tmp[cursor2--];
						count2++;
						count1 = 0;
						if (--len2 == 1) break outer;
					}
			} while ((count1 | count2) < minGallop);

			/*
			* One run is winning so consistently that galloping may be a huge win. So try that, and continue galloping until (if
			* ever) neither run appears to be winning consistently anymore.
			*/
			do {
				count1 = len1 - await gallopRight(tmp[cursor2], a, base1, len1, len1 - 1, c);
				if (count1 != 0) {
					dest -= count1;
					cursor1 -= count1;
					len1 -= count1;
					arraycopy(a, cursor1 + 1, a, dest + 1, count1);
					if (len1 == 0) break outer;
				}
				a[dest--] = tmp[cursor2--];
				if (--len2 == 1) break outer;

				count2 = len2 - await gallopLeft(a[cursor1], tmp, 0, len2, len2 - 1, c);
				if (count2 != 0) {
					dest -= count2;
					cursor2 -= count2;
					len2 -= count2;
					arraycopy(tmp, cursor2 + 1, a, dest + 1, count2);
					if (len2 <= 1) // len2 == 1 || len2 == 0
						break outer;
				}
				a[dest--] = a[cursor1--];
				if (--len1 == 0) break outer;
					minGallop--;
			} while (count1 >= MIN_GALLOP || count2 >= MIN_GALLOP);
			if (minGallop < 0) minGallop = 0;
			minGallop += 2; // Penalize for leaving gallop mode
		} // End of "outer" loop
		minGallop = minGallop < 1 ? 1 : minGallop; // Write back to field

		if (len2 == 1) {
			dest -= len1;
			cursor1 -= len1;
			arraycopy(a, cursor1 + 1, a, dest + 1, len1);
			a[dest] = tmp[cursor2]; // Move first elt of run2 to front of merge
		} else if (len2 == 0) {
			throw new Error("IllegalArgumentException. Comparison method violates its general contract!");
		} else {
			arraycopy(tmp, 0, a, dest - (len2 - 1), len2);
			global_a = a;
		}
	}


	/**
	* Checks that fromIndex and toIndex are in range, and throws an appropriate exception if they aren't.
	*
	* @param arrayLen the length of the array
	* @param fromIndex the index of the first element of the range
	* @param toIndex the index after the last element of the range
	* @throws IllegalArgumentException if fromIndex > toIndex
	* @throws ArrayIndexOutOfBoundsException if fromIndex < 0 or toIndex > arrayLen
	*/
	function rangeCheck (arrayLen: number, fromIndex: number, toIndex: number) {
		if (fromIndex > toIndex) throw new Error( "IllegalArgument fromIndex(" + fromIndex + ") > toIndex(" + toIndex + ")");
		if (fromIndex < 0) throw new Error( "ArrayIndexOutOfBounds "+fromIndex);
		if (toIndex > arrayLen) throw new Error( "ArrayIndexOutOfBounds "+toIndex);
	}
}

// java System.arraycopy(Object src, int srcPos, Object dest, int destPos, int length)
function arraycopy<T>(s: Array<T>,spos: number,d: Array<T>,dpos: number,len: number){
	let a=s.slice(spos,spos+len);
	while(len--){
		d[dpos+len]=a[len];
	}
}